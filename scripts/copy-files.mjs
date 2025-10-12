import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

// 确保 public 目录存在
await fs.ensureDir(publicDir);

// 要复制的文件类型
const fileExtensions = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];

// 要复制的目录
const copyDirs = ['zh', 'en', 'ja', 'css', 'js', 'images', 'img', 'assets'];

// 复制根目录下的文件
console.log('正在复制根目录文件...');
const rootFiles = await fs.readdir(rootDir);
for (const file of rootFiles) {
  const ext = path.extname(file).toLowerCase();
  if (fileExtensions.includes(ext)) {
    try {
      await fs.copy(
        path.join(rootDir, file),
        path.join(publicDir, file)
      );
      console.log(`已复制: ${file}`);
    } catch (err) {
      console.error(`复制文件 ${file} 时出错:`, err.message);
    }
  }
}

// 复制子目录
for (const dir of copyDirs) {
  const sourceDir = path.join(rootDir, dir);
  const targetDir = path.join(publicDir, dir);
  
  try {
    if (await fs.pathExists(sourceDir)) {
      await fs.copy(sourceDir, targetDir, { overwrite: true });
      console.log(`已复制目录: ${dir}`);
    }
  } catch (err) {
    console.error(`复制目录 ${dir} 时出错:`, err.message);
  }
}

console.log('文件复制完成！');
