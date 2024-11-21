import { formatPrompt } from './helper.js';
import { routeAnswer } from './route.js';
import { construct, split_content_and_tile } from './struturizer.js';
import { readFileSync } from 'fs';
import path from 'path';
import { decomposeQuery, extractKW, mergeResult } from './utilizer.js';

const evalDataPath = "./dist/data/value.jsonl";
const evalDatas = readFileSync(path.resolve(process.cwd(), evalDataPath), 'utf-8')
    .split('\n')
    .filter((line: string) => line.trim() !== '')
    .map((line: string) => JSON.parse(line))
    .sort(() => Math.random() - 0.5);

console.log(`len eval_datas: ${evalDatas.length}`);

const getSecondsBetweenDates = (date1: Date, date2: Date): number => {
  const diffInMilliseconds = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffInMilliseconds / 1000);
}

const evalValue = async (data:any): Promise<{ time: number, answer: string, query: string }> => {
  const startTime = new Date();
  const query = await formatPrompt(data['prompt_template'], { instruction:data['instruction'], question:data['question'], docs:"......"});
  const [_, titles] = split_content_and_tile(data['docs'])
  const core_content = "The titles of the docs are: " + "\n" + titles.join();
  const chosen = await routeAnswer(query.value, core_content, data['id']);
  // console.log(chosen)
  
  const [kb_info, result] = await construct([query.value], chosen, [data['docs']], data['id']);
  // console.log(kb_info, result);

  const subqueries = await decomposeQuery(query.value, kb_info, data['id']);
  // console.log(subqueries);

  const subknowledges = await extractKW(result, subqueries, chosen, data['id']);
  // console.log(subknowledges);

  const answer = await mergeResult(query.value, subqueries, subknowledges, chosen, data['id']);
  return {
    time: getSecondsBetweenDates(startTime, new Date()),
    answer: answer.message.content,
    query: query.value,
  };
};

const finalResult = await Promise.all(evalDatas.map(async (data: any) => evalValue(data)));

console.log(finalResult);