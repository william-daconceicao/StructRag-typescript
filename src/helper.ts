import { StringPromptValueInterface } from '@langchain/core/prompt_values';
import { PromptTemplate } from '@langchain/core/prompts';
import { readFileSync } from 'fs';
import path from 'path';
import ollama, { ChatResponse } from 'ollama'

export const getPromptFile = (fileName: string): string => {
  return readFileSync(path.resolve(process.cwd(), `./dist/prompts/${fileName}.txt`), 'utf-8');
}

export const getPromptFromFile = async (fileName: string, options: { [key:string]: string}): Promise<StringPromptValueInterface> => {
  const raw_prompt = getPromptFile(fileName);
  return formatPrompt(raw_prompt, options)
}

export const formatPrompt = async (raw_prompt: string, options: { [key:string]: string}): Promise<StringPromptValueInterface> => {
  const promptTemplate = PromptTemplate.fromTemplate(raw_prompt);
  return promptTemplate.invoke(options);
}

export const generateAnswer = async (promptString: string): Promise<ChatResponse> => {
  return ollama.chat({
    model: 'qwen2.5:3b',
    messages: [{ role: 'user', content: promptString }],
  });
};