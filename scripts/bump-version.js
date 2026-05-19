#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const current = appJson.expo.android.versionCode || 1;
appJson.expo.android.versionCode = current + 1;

// Also bump the semver patch version
const [major, minor, patch] = (appJson.expo.version || '1.0.0').split('.').map(Number);
appJson.expo.version = `${major}.${minor}.${patch + 1}`;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log('versionCode: ' + current + ' -> ' + appJson.expo.android.versionCode);
console.log('version: ' + major + '.' + minor + '.' + patch + ' -> ' + appJson.expo.version);
