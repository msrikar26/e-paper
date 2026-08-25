@echo off
cd /d C:\Users\kusum\OneDrive\Documents\newspulse

echo Removing old git history...
rmdir /s /q .git

echo Initializing fresh repository...
git init
git remote add origin https://github.com/msrikar26/news-website.git

echo Adding all files...
git add .

echo Creating clean commit...
git commit -m "NewsPulse - Full-stack news website with frontend, backend API, database, and admin panel"

echo Pushing to GitHub...
git push -u origin main --force

echo Done!
