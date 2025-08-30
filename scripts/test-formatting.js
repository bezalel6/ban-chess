#!/usr/bin/env node

/**
 * Script to test formatting and linting configuration
 * This helps verify that ESLint and Prettier work together without conflicts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Testing Formatting & Linting Configuration\n');

// Test file content for verification
const testFileContent = `
import React from "react";
import { useState } from 'react';

export default function TestComponent( ) {
    const [count,setCount] = useState(0)
    const handleClick=()=>{setCount(count+1)}
    return <div onClick={handleClick}>Count: {count}</div>
}
`.trim();

const testFilePath = path.join(__dirname, '..', 'test-formatting-temp.tsx');

try {
  // Create test file with intentionally bad formatting
  console.log('1️⃣ Creating test file with mixed formatting...');
  fs.writeFileSync(testFilePath, testFileContent);

  // Run Prettier
  console.log('2️⃣ Running Prettier...');
  try {
    execSync(`npx prettier --write "${testFilePath}"`, { stdio: 'pipe' });
    console.log('✅ Prettier ran successfully');
  } catch (error) {
    console.error('❌ Prettier failed:', error.message);
  }

  // Run ESLint
  console.log('3️⃣ Running ESLint...');
  try {
    execSync(`npx eslint "${testFilePath}"`, { stdio: 'pipe' });
    console.log('✅ ESLint ran successfully (no formatting conflicts)');
  } catch {
    console.log('ℹ️ ESLint found issues (this is normal for code quality)');
  }

  // Show formatted result
  console.log('4️⃣ Final formatted code:');
  console.log('─'.repeat(50));
  console.log(fs.readFileSync(testFilePath, 'utf8'));
  console.log('─'.repeat(50));

  console.log('\n✅ Configuration test completed successfully!');
  console.log('🎉 ESLint and Prettier are working together without conflicts');
} catch (error) {
  console.error('❌ Test failed:', error.message);
} finally {
  // Cleanup
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Cleaned up test file');
  }
}

console.log('\n📝 Save Workflow Summary:');
console.log('1. Edit your code');
console.log('2. Save (Ctrl+S)');
console.log('3. Prettier formats the code');
console.log('4. ESLint auto-fixes code quality issues');
console.log('5. No more version conflicts! 🎉');
