// eslint-disable-next-line import/no-extraneous-dependencies
import * as wrangler from 'wrangler';
import * as fs from 'fs';
import * as path from 'path';

function deleteFolderSync(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file: string) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursively delete contents
        deleteFolderSync(curPath);
      } else {
        // Delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

export default async function start() {
  deleteFolderSync('.wrangler');

  return wrangler.unstable_dev('src/server.ts', {
    persist: false,
    experimental: {
      disableExperimentalWarning: true,
    },
  });
}
