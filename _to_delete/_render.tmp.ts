import { SAMPLE_01 } from './src/fixtures/sample01.js'
import { toMarkdown } from './lib/export-markdown.js'
console.log(toMarkdown(SAMPLE_01 as never))
