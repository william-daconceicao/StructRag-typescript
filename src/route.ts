import { generateAnswer, getPromptFromFile } from "./helper.js";

export const routeAnswer = async (query: string, titles: string, data_id?: string): Promise<'table' | 'graph' | 'algorithm' | 'catalogue' | 'chunk'>  => {
  console.log(`do_route for ${data_id || query}`);
  
  const prompt = await getPromptFromFile('route', { titles, query });

  const response = await generateAnswer(prompt.value);
  const output: string = response.message.content;

  switch(output) {
    case 'table':
      return 'table';
    case 'graph':
      return 'graph';
    case 'algorithm':
      return 'algorithm';
    case 'catalogue':
      return 'catalogue';
    default:
      return 'chunk';
  };
};