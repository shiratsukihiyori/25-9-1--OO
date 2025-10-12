import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保 public 目录存在
const publicDir = path.join(__dirname, '../public');
try {
  await fs.mkdir(publicDir, { recursive: true });
} catch (err) {
  if (err.code !== 'EEXIST') throw err;
}

// 复制文件到 public 目录
function copyFiles() {
  // 复制根目录的 HTML 文件
  const rootFiles = await fs.readdir(path.join(__dirname, '..'));
  for (const file of rootFiles) {
    if (file.endsWith('.html') || file.endsWith('.css') || file.endsWith('.js') || file.endsWith('.json')) {
      try {
        await fs.copyFile(
          path.join(__dirname, '..', file),
          path.join(publicDir, file)
        );
        console.log(`已复制: ${file}`);
      } catch (err) {
        console.error(`复制文件 ${file} 时出错:`, err);
      }
    }
  }

  // 复制多语言目录
  const langDirs = ['zh', 'en', 'ja'];
  for (const lang of langDirs) {
    const langPath = path.join(__dirname, '..', lang);
    try {
      await fs.access(langPath);
      const targetLangPath = path.join(publicDir, lang);
      
      try {
        await fs.mkdir(targetLangPath, { recursive: true });
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;
      }
      
      const files = await fs.readdir(langPath);
      for (const file of files) {
        if (file.endsWith('.html') || file.endsWith('.css') || file.endsWith('.js')) {
          try {
            await fs.copyFile(
              path.join(langPath, file),
              path.join(targetLangPath, file)
            );
            console.log(`已复制: ${lang}/${file}`);
          } catch (err) {
            console.error(`复制文件 ${lang}/${file} 时出错:`, err);
          }
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`处理语言目录 ${lang} 时出错:`, err);
      }
    }
  }

  // 复制其他资源目录（如图片、CSS、JS 等）
  const assetDirs = ['css', 'js', 'images', 'img', 'assets'];
  assetDirs.forEach(dir => {
    const sourceDir = path.join(__dirname, '..', dir);
    if (fs.existsSync(sourceDir)) {
      const targetDir = path.join(publicDir, dir);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // 使用 xcopy 命令复制目录（Windows）
      try {
        execSync(`xcopy "${sourceDir}\\*" "${targetDir}\\*" /E /I /Y`);
        console.log(`已复制目录: ${dir}`);
      } catch (error) {
        console.error(`复制目录 ${dir} 时出错:`, error);
      }
    }
  });
}

// 执行复制
copyFiles().then(() => {
  console.log('文件复制完成！');
}).catch(err => {
  console.error('复制文件时出错:', err);
  process.exit(1);
});
