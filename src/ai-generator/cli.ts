#!/usr/bin/env tsx
import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'node:path';
import { generateTests } from './generator.js';
import { parseOpenApi, summarizeEndpoints } from './openapi-parser.js';
import { logger } from './logger.js';

const program = new Command();

program
  .name('ai-qa')
  .description('AI-assisted QA test generation from OpenAPI specs')
  .version('1.0.0');

program
  .command('generate', { isDefault: true })
  .description('Generate Playwright API test specs from an OpenAPI document')
  .option('-s, --spec <path>', 'Path or URL to OpenAPI/Swagger spec', process.env.OPENAPI_SPEC_PATH || './specs/petstore-openapi.json')
  .option('-o, --out <dir>', 'Output directory for generated specs', process.env.QA_OUTPUT_DIR || './tests/generated')
  .option('-n, --max <number>', 'Max test cases per endpoint', (v: string) => parseInt(v, 10), parseInt(process.env.QA_MAX_CASES_PER_ENDPOINT || '6', 10))
  .option('-f, --filter <text>', 'Only process endpoints matching this substring/method')
  .option('-c, --concurrency <number>', 'Parallel LLM requests', (v: string) => parseInt(v, 10), 3)
  .action(async (opts: any) => {
    const start = Date.now();
    try {
      const summary = await generateTests({
        specPath: opts.spec,
        outDir: path.resolve(opts.out),
        maxCasesPerEndpoint: opts.max,
        endpointFilter: opts.filter,
        concurrency: opts.concurrency,
      });

      const ms = Date.now() - start;
      console.log('');
      console.log(chalk.green.bold('✓ Test generation complete'));
      console.log(`  ${chalk.cyan('Endpoints processed:')} ${summary.endpoints}`);
      console.log(`  ${chalk.cyan('Test cases generated:')} ${summary.generated}`);
      console.log(`  ${chalk.cyan('Files written:')}        ${summary.files.length}`);
      console.log(`  ${chalk.cyan('Duration:')}             ${ms}ms`);
      console.log('');
      console.log(chalk.dim('Run them with:  npm run test:api'));
    } catch (err) {
      logger.error({ err: String(err) }, 'Generation failed');
      console.error(chalk.red(`\n✗ Generation failed: ${String(err)}\n`));
      process.exit(1);
    }
  });

program
  .command('inspect')
  .description('Parse and print the endpoints discovered in a spec')
  .option('-s, --spec <path>', 'Path or URL to OpenAPI/Swagger spec', process.env.OPENAPI_SPEC_PATH || './specs/petstore-openapi.json')
  .action(async (opts: any) => {
    try {
      const endpoints = await parseOpenApi(opts.spec);
      console.log(chalk.bold(`\nDiscovered ${endpoints.length} endpoints:\n`));
      console.log(summarizeEndpoints(endpoints));
      console.log('');
    } catch (err) {
      console.error(chalk.red(`\n✗ Parse failed: ${String(err)}\n`));
      process.exit(1);
    }
  });

program.parseAsync(process.argv);