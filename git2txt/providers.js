// providers.js
export const providers = [
    {
      name: 'github',
      match: (input) => {
        return input.startsWith('https://github.com/') || 
               input.match(/^[\w-]+\/[\w-]+$/);
      },
      normalize: (input) => {
        if (input.match(/^[\w-]+\/[\w-]+$/)) {
          return `https://github.com/${input}`;
        }
        return input.replace(/\/+$/, '');
      }
    },
    {
      name: 'gitlab',
      match: (input) => {
        return input.startsWith('https://gitlab.com/') || 
               input.match(/^[\w-]+\/[\w-]+$/); // ya gitlab ke liye koi pattern
      },
      normalize: (input) => {
        if (input.match(/^[\w-]+\/[\w-]+$/)) {
          return `https://gitlab.com/${input}`;
        }
        return input.replace(/\/+$/, '');
      }
    },
    // Aur providers add kar sakte hain jaise bitbucket, etc.
    // If you need to add more providers like bitbucket, use above logic.
  ];
  // Local git
  // javascript dimag kharab karta hai
  // Local provider handle karne ka tarika:
  export async function checkLocalPath(input) {
    const fs = await import('fs/promises');
    const path = await import('path');
    try {
      const absPath = path.resolve(process.cwd(), input);
      const stats = await fs.stat(absPath);
      if (stats.isDirectory()) {
        const gitPath = path.join(absPath, '.git');
        let gitStats;
        try {
          gitStats = await fs.stat(gitPath);
        } catch (e) {
          gitStats = null;
        }
        if (gitStats && gitStats.isDirectory()) {
          return {type: 'local', path: absPath};
        } else {
          throw new Error('Not a valid local git repo');
        }
      }
    } catch(e) {
      throw new Error('Not a valid path');
    }
  }
  