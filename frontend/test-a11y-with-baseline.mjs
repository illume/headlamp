#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASELINE_FILE = path.join(__dirname, '.axe-storybook-baseline.json');

// Load baseline
let baseline = { baseline: {} };
if (existsSync(BASELINE_FILE)) {
  try {
    baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
    console.log(`\n📋 Loaded baseline with ${Object.keys(baseline.baseline).length} known failing stories`);
    console.log(`   Baseline allows known failures while catching new violations\n`);
  } catch (error) {
    console.error(`Warning: Could not parse baseline file: ${error.message}`);
  }
}

// Run axe-storybook and capture output
const axeProcess = spawn('npx', [
  'axe-storybook',
  '--build-dir',
  '../docs/development/storybook'
], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

let output = '';
let errorOutput = '';
let currentTest = null;
const testResults = {
  passes: 0,
  failures: [],
  total: 0
};

// Parse output line by line
axeProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text); // Also print to console

  // Parse test results from spec output
  const lines = text.split('\n');
  lines.forEach(line => {
    // Detect passed tests
    if (line.includes('✔') || line.includes('✓')) {
      testResults.passes++;
      testResults.total++;
    }
    // Detect failed tests - format: "  1) Component/Story"
    const failMatch = line.match(/^\s+\d+\)\s+(.+)$/);
    if (failMatch) {
      currentTest = failMatch[1].trim();
    }
    // Detect violation rules - format: "1. rule-name (description)"
    const violationMatch = line.match(/^\s+\d+\.\s+([a-z-]+)\s+\(/);
    if (violationMatch && currentTest) {
      const rule = violationMatch[1];
      let existing = testResults.failures.find(f => f.story === currentTest);
      if (!existing) {
        existing = { story: currentTest, violations: [] };
        testResults.failures.push(existing);
        testResults.total++;
      }
      if (!existing.violations.includes(rule)) {
        existing.violations.push(rule);
      }
    }
  });
});

axeProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
  process.stderr.write(data);
});

axeProcess.on('close', (code) => {
  // Analyze results against baseline
  const newFailures = [];
  const knownFailures = [];

  testResults.failures.forEach(failure => {
    const baselineRules = baseline.baseline[failure.story] || [];
    const unexpectedRules = failure.violations.filter(rule => !baselineRules.includes(rule));

    if (unexpectedRules.length > 0) {
      newFailures.push({ story: failure.story, unexpectedRules, allViolations: failure.violations });
    } else {
      knownFailures.push({ story: failure.story, violations: failure.violations });
    }
  });

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 ACCESSIBILITY TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`\nTotal stories tested: ${testResults.total}`);
  console.log(`✅ Passing: ${testResults.passes} (${((testResults.passes / testResults.total) * 100).toFixed(1)}%)`);
  console.log(`📋 Known baseline failures: ${knownFailures.length}`);
  console.log(`❌ New failures: ${newFailures.length}`);

  if (knownFailures.length > 0) {
    console.log(`\n✓ ${knownFailures.length} stories have known baseline violations (not blocking CI)`);
    console.log(`  See docs/a11y-issues.md for details on known issues`);
  }

  if (newFailures.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('❌ NEW ACCESSIBILITY VIOLATIONS DETECTED');
    console.log('='.repeat(70));
    newFailures.forEach(({ story, unexpectedRules, allViolations }) => {
      console.log(`\n📍 Story: ${story}`);
      console.log(`   New violations: ${unexpectedRules.join(', ')}`);
      console.log(`   All violations: ${allViolations.join(', ')}`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log(`❌ CI FAILED: ${newFailures.length} new accessibility violation(s)`);
    console.log('='.repeat(70));
    console.log('\nTo fix this:');
    console.log('  1. Fix the new accessibility violations in the components');
    console.log('  2. OR if intentional, update frontend/.axe-storybook-baseline.json');
    console.log('  3. Run "npm run frontend:test:a11y" locally to verify\n');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ ALL TESTS PASSED - No new accessibility violations detected');
  console.log('='.repeat(70));
  console.log('');
  process.exit(0);
});

axeProcess.on('error', (error) => {
  console.error('Failed to run axe-storybook:', error);
  process.exit(1);
});
