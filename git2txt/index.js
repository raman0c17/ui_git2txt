#!/usr/bin/env node

/**
 * git2txt - A command-line tool to convert GitHub repositories into readable text files
 * 
 * This tool clones a GitHub repository, processes its text files, and combines them
 * into a single output file. It's useful for code review, analysis, and documentation
 * purposes.
 * 
 * Features:
 * - Supports public GitHub repositories
 * - Filters binary and large files
 * - Customizable file size threshold
 * - Debug mode for troubleshooting
 * - Progress indicators for long operations
 * 
 * @module git2txt
 */

import meow from 'meow';
import ora from 'ora';
import chalk from 'chalk';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { filesize as formatFileSize } from 'filesize';
import { isBinaryFile } from 'isbinaryfile';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// CLI help text with usage instructions and examples
const helpText = `
  ${chalk.bold('Usage')}
    $ git2txt <repository-url>

  ${chalk.bold('Options')}
    --output, -o     Specify output file path
    --threshold, -t  Set file size threshold in MB (default: 0.5)
    --include-all    Include all files regardless of size or type
    --debug         Enable debug mode with verbose logging
    --help          Show help
    --version       Show version

  ${chalk.bold('Examples')}
    $ git2txt https://github.com/username/repository
    $ git2txt https://github.com/username/repository --output=output.txt
`;

/**
 * Custom exit function that handles both production and test environments
 * @param {number} code - Exit code to return
 * @throws {Error} In test environment instead of exiting
 */
const exit = (code) => {
    if (process.env.NODE_ENV === 'test') {
        throw new Error(`Exit called with code: ${code}`);
    } else {
        process.exit(code);
    }
};

// Initialize CLI parser with meow
export const cli = meow(helpText, {
    importMeta: import.meta,
    flags: {
        output: {
            type: 'string',
            shortFlag: 'o'
        },
        threshold: {
            type: 'number',
            shortFlag: 't',
            default: 0.1
        },
        includeAll: {
            type: 'boolean',
            default: false
        },
        debug: {
            type: 'boolean',
            default: false
        }
    }
});

/**
 * Normalizes various GitHub URL formats to a consistent format
 * @param {string} url - The GitHub repository URL to normalize
 * @returns {string} Normalized GitHub URL
 * @throws {Error} If URL format is invalid
 */
function normalizeGitHubUrl(url) {
    try {
        // Remove trailing slashes
        url = url.replace(/\/+$/, '');
        
        // Handle git@ URLs
        if (url.startsWith('git@github.com:')) {
            return url;
        }
        
        // Handle full HTTPS URLs
        if (url.startsWith('https://github.com/')) {
            return url;
        }
        
        // Handle short format (user/repo)
        if (url.match(/^[\w-]+\/[\w-]+$/)) {
            return `https://github.com/${url}`;
        }
        
        throw new Error('Invalid GitHub repository URL format');
    } catch (error) {
        throw new Error(`Invalid GitHub URL: ${url}`);
    }
}

/**
 * Validates the command line input
 * @param {string[]} input - Command line arguments
 * @returns {Promise<string>} Validated repository URL
 * @throws {Error} If input is missing or invalid
 */
export async function validateInput(input) {
    if (!input || input.length === 0) {
        throw new Error('Repository URL or local path is required');
    }

    // Relative path ko absolute bana rahe hain
    const urlOrPath = path.resolve(process.cwd(), input[0]);

    // Check if local directory
    try {
        const stats = await fs.stat(urlOrPath);
        if (stats.isDirectory()) {
            const gitPath = path.join(urlOrPath, '.git');
            const gitStats = await fs.stat(gitPath).catch(() => null);
            if (gitStats && gitStats.isDirectory()) {
                return { type: 'local', path: urlOrPath };
            } else {
                throw new Error('Provided path is not a valid git repository (no .git directory found)');
            }
        }
    } catch (error) {
        // Not a directory or something else
    }

    // Agar ye local directory nahi hai to phir github URL check
    if (!urlOrPath.includes('github.com') && !urlOrPath.match(/^[\w-]+\/[\w-]+$/)) {
        throw new Error('Only GitHub repositories or valid local paths are supported');
    }

    return { type: 'github', url: urlOrPath };
}



/**
 * Downloads a GitHub repository to a temporary directory
 * @param {string} url - GitHub repository URL
 * @returns {Promise<Object>} Object containing temporary directory path and repository name
 * @throws {Error} If download fails
 */
export async function downloadRepository(url) {
    const spinner = process.env.NODE_ENV !== 'test' ? ora('Downloading repository...').start() : null;
    const tempDir = path.join(os.tmpdir(), `git2txt-${Date.now()}`);

    try {
        // Normalize the GitHub URL
        const normalizedUrl = normalizeGitHubUrl(url);
        const repoName = url.split('/').pop().replace('.git', '');
        
        if (cli.flags.debug) {
            console.log(chalk.blue('Debug: Normalized URL:'), normalizedUrl);
            console.log(chalk.blue('Debug: Temp directory:'), tempDir);
        }

        // Create temp directory
        await fs.mkdir(tempDir, { recursive: true });

        // Clone the repository
        const cloneCommand = `git clone --depth 1 ${normalizedUrl} ${tempDir}`;
        
        if (cli.flags.debug) {
            console.log(chalk.blue('Debug: Executing command:'), cloneCommand);
        }

        await execAsync(cloneCommand, {
            maxBuffer: 1024 * 1024 * 100 // 100MB buffer
        });
        
        // Verify the download
        const files = await fs.readdir(tempDir);
        if (files.length === 0) {
            throw new Error('Repository appears to be empty');
        }

        if (spinner) spinner.succeed('Repository downloaded successfully');
        return { tempDir, repoName };
    } catch (error) {
        if (spinner) spinner.fail('Failed to download repository');
        
        if (cli.flags.debug) {
            console.log(chalk.blue('Debug: Full error:'), error);
        }
        
        if (process.env.NODE_ENV !== 'test') {
            console.error(chalk.red('Error: Could not access the repository. Please check:'));
            console.error(chalk.yellow('  1. The repository exists and is public'));
            console.error(chalk.yellow('  2. You have the correct repository URL'));
            console.error(chalk.yellow('  3. GitHub is accessible from your network'));
            console.error(chalk.yellow('  4. Git is installed and accessible from command line'));
        }
        
        await cleanup(tempDir);
        throw error;
    }
}

/**
 * Processes files in the repository directory and combines them into a single text output
 * @param {string} directory - Path to the repository directory
 * @param {Object} options - Processing options
 * @param {number} options.threshold - File size threshold in MB
 * @param {boolean} options.includeAll - Whether to include all files regardless of size/type
 * @returns {Promise<string>} Combined content of all processed files
 * @throws {Error} If file processing fails
 */
export async function processFiles(directory, options) {
    let spinner = process.env.NODE_ENV !== 'test' ? ora('Processing files...').start() : null;
    const thresholdBytes = options.threshold * 1024 * 1024;
    let output = '';
    let processedFiles = 0;
    let skippedFiles = 0;

    /**
     * Recursively processes files in a directory
     * @param {string} dir - Directory to process
     */
    async function processDirectory(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
                // Recursively process subdirectories
                await processDirectory(fullPath);
                continue;
            }

            if (!entry.isFile()) continue;

            try {
                const stats = await fs.stat(fullPath);

                // Skip if file is too large and we're not including all files
                if (!options.includeAll && stats.size > thresholdBytes) {
                    if (process.env.DEBUG) console.log(`Skipping large file: ${entry.name}`);
                    skippedFiles++;
                    continue;
                }

                // Skip binary files unless includeAll is true
                if (!options.includeAll) {
                    if (await isBinaryFile(fullPath)) {
                        if (process.env.DEBUG) console.log(`Skipping binary file: ${entry.name}`);
                        skippedFiles++;
                        continue;
                    }
                }

                const content = await fs.readFile(fullPath, 'utf8');
                const relativePath = path.relative(directory, fullPath);
                
                output += `\n${'='.repeat(80)}\n`;
                output += `File: ${relativePath}\n`;
                output += `Size: ${formatFileSize(stats.size)}\n`;
                output += `${'='.repeat(80)}\n\n`;
                output += `${content}\n`;
                
                processedFiles++;

                if (process.env.DEBUG) {
                    console.log(`Processed file: ${relativePath}`);
                }
            } catch (error) {
                if (process.env.DEBUG) {
                    console.error(`Error processing ${entry.name}:`, error);
                }
                skippedFiles++;
            }
        }
    }

    try {
        // Process the entire directory tree
        await processDirectory(directory);

        if (spinner) {
            spinner.succeed(`Processed ${processedFiles} files successfully (${skippedFiles} skipped)`);
        }

        if (processedFiles === 0 && process.env.DEBUG) {
            console.warn('Warning: No files were processed');
        }

        return output;

    } catch (error) {
        if (spinner) {
            spinner.fail('Failed to process files');
        }
        throw error;
    }
}

/**
 * Writes the processed content to an output file
 * @param {string} content - Content to write
 * @param {string} outputPath - Path to the output file
 * @returns {Promise<void>}
 * @throws {Error} If writing fails
 */
export async function writeOutput(content, outputPath) {
    let spinner = process.env.NODE_ENV !== 'test' ? ora('Writing output file...').start() : null;

    try {
        await fs.writeFile(outputPath, content);
        if (spinner) spinner.succeed(`Output saved to ${chalk.green(outputPath)}`);
    } catch (error) {
        if (spinner) spinner.fail('Failed to write output file');
        if (process.env.NODE_ENV !== 'test') {
            console.error(chalk.red('Write error:'), error);
        }
        throw error;
    }
}

/**
 * Cleans up temporary files and directories
 * @param {string} directory - Directory to clean up
 * @returns {Promise<void>}
 */
export async function cleanup(directory) {
    try {
        await fs.rm(directory, { recursive: true, force: true });
    } catch (error) {
        if (process.env.NODE_ENV !== 'test') {
            console.error(chalk.yellow('Warning: Failed to clean up temporary files'));
        }
    }
}

/**
 * Main application function that orchestrates the entire process
 * @returns {Promise<void>}
 */
export async function main() {
    let tempDir;
    try {
        const input = await validateInput(cli.input);

        if (input.type === 'local') {
            const content = await processFiles(input.path, {
                threshold: cli.flags.threshold,
                includeAll: cli.flags.includeAll
            });

            await writeOutput(content, cli.flags.output || 'output.txt');
        } else {
            const result = await downloadRepository(input.url);
            tempDir = result.tempDir;

            const content = await processFiles(tempDir, {
                threshold: cli.flags.threshold,
                includeAll: cli.flags.includeAll
            });

            await writeOutput(content, cli.flags.output || `${result.repoName}.txt`);
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        if (tempDir) {
            await cleanup(tempDir);
        }
    }
}


// Only run main if not in test environment
if (process.env.NODE_ENV !== 'test') {
    main();
}