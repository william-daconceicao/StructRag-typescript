import { PromptTemplate } from "@langchain/core/prompts";
import { generateAnswer, getPromptFile, getPromptFromFile } from "./helper.js";

export const construct = async(query: string[], chosen: string, docs: string[], data_id: string): Promise<[string, string[]]> => {
  console.log(`data_id: ${data_id}, construct...`);

  if (chosen === "graph") {
    const instruction = `Based on the given document, construct a graph where entities are the titles of papers and the relation is 'reference', using the given document title as the head and other paper titles as tails.`;
    const info_of_graph = await constructGraph(instruction, docs, data_id);
    return info_of_graph;
  } else if (chosen === "table") {
    const composed_query = query.join("\n");
    const instruction = `Query is ${composed_query}, please extract relevant complete tables from the document based on the attributes and keywords mentioned in the Query. Note: retain table titles and source information.`;
    const info_of_table = await constructTable(instruction, docs, data_id);
    return info_of_table;
  } else if (chosen === "algorithm") {
    const composed_query = query.join("\n");
    const instruction = `Query is ${composed_query}, please extract relevant algorithms from the document based on the Query.`;
    const info_of_algorithm = await constructAlgorithm(instruction, docs, data_id);
    return info_of_algorithm;
  } else if (chosen === "catalogue") {
    const composed_query = query.join("\n");
    const instruction = `Query is ${composed_query}, please extract relevant catalogues from the document based on the Query.`;
    const info_of_catalogue = await constructCatalogue(instruction, docs, data_id);
    return info_of_catalogue;
  } else if (chosen === "chunk") {
    const instruction = `construct chunk`;
    const info_of_chunk = constructChunk(docs, data_id);
    return info_of_chunk;
  } else {
    throw new Error("chosen should be in ['graph', 'table', 'algorithm', 'catalogue', 'chunk']");
  }
}

const constructGraph = async (instruction: string, docs: any[], data_id: string): Promise<[string, string[]]> => {
  console.log(`data_id: ${data_id}, constructGraph...`);
  const [docsProcessed, titles] = split_content_and_tile(docs);

  const graphs: string[] = await Promise.all(docsProcessed.map(async (doc, d) => {
    console.log(`data_id: ${data_id}, constructGraph... in doc ${d}/${docsProcessed.length} in docs ..`);
    const title = doc['title'];
    const content = doc['document'];

    const prompt = await getPromptFromFile('constructGraph', { requirement: instruction, raw_content: content, titles: titles.join("\n") });
    
    const output = (await generateAnswer(prompt.value))?.message.content;
    return `${title}: ${output}`;
  }));

  const info_of_graph = graphs[0].split("\n")[0];
  return [info_of_graph, graphs.slice(1)];
}

const constructTable = async (instruction: string, docs: any[], data_id: string): Promise<[string, string[]]> => {
  console.log(`data_id: ${data_id}, constructTable...`);
  const [docsProcessed, titles] = split_content_and_tile(docs);

  const tables: string[] = await Promise.all(docsProcessed.map(async (doc, d) => {
    console.log(`data_id: ${data_id}, constructTable... in doc ${d}/${docsProcessed.length} in docs ..`);
    const title = doc['title'];
    const content = doc['document'];

    const prompt = await getPromptFromFile('constructTable', { instruction: instruction, content: content });
    const output = (await generateAnswer(prompt.value))?.message.content;

    return `${title}: ${output}`;
  }));

  const info_of_table = tables[0].split("\n")[0];
  return [info_of_table, tables.slice(1)];
}

const constructChunk = (docs: any[], data_id: string): [string, string[]] => {
  console.log(`data_id: ${data_id}, constructChunk...`);
  const [docsProcessed, titles] = split_content_and_tile(docs);

  const chunks: string[] = [];
  docsProcessed.map(doc => {
      const title = doc['title'];
      const content = doc['document'];
      chunks.push(`${title}: ${content}`);
  });

  const info_of_chunk = titles.join(" ");
  return [info_of_chunk, chunks];
}

const constructAlgorithm = async (instruction: string, docs: any[], data_id: string): Promise<[string, string[]]> => {
  console.log(`data_id: ${data_id}, constructAlgorithm...`);
  const [docsProcessed, titles] = split_content_and_tile(docs);

  const algorithms: string[] = await Promise.all(docsProcessed.map(async (doc, d) => {
      console.log(`data_id: ${data_id}, constructAlgorithm... in doc ${d}/${docsProcessed.length} in docs ..`);
      const title = doc['title'];
      const content = doc['document'];
      const prompt = await getPromptFromFile('constructAlgorithm', { requirement: instruction, raw_content: content });
      const output = (await generateAnswer(prompt.value))?.message.content;
      return `${title}: ${output}`;
  }));

  const info_of_algorithm = algorithms[0].split("\n")[0];
  return [info_of_algorithm, algorithms.slice(1)];
}

const constructCatalogue = async (instruction: string, docs: any[], data_id: string): Promise<[string, string[]]> => {
  console.log(`data_id: ${data_id}, constructCatalogue...`);
  const [docsProcessed, titles] = split_content_and_tile(docs);

  const instructionProcessed = instruction.split("Query:\n")[1];

  const catalogues: string[] = await Promise.all(docsProcessed.map(async (doc, d) => {
      console.log(`data_id: ${data_id}, constructCatalogue... in doc ${d}/${docsProcessed.length} in docs ..`);
      const title = doc['title'];
      const document = doc['document'];
      const raw_prompt = await getPromptFile('constructCatalogue');

      const len_document = document.length;
      const contents = [document];
      const tmpCatalogues = await Promise.all(contents.map(async(content, c) => {
          console.log(`data_id: ${data_id}, constructCatalogue... in doc ${d}/${docsProcessed.length} in docs .. in content ${c}/${contents.length} in contents ..`);
          const promptTemplate = PromptTemplate.fromTemplate(raw_prompt);
          const prompt = await promptTemplate.invoke({ requirement: instructionProcessed, raw_content: content });
          const output = (await generateAnswer(prompt.value))?.message.content;
          
          return `\n\n${title}: ${output}`;
      }));

      return tmpCatalogues.join();
  }));

  const info_of_catalogue = catalogues[0].split("\n")[0];
  return [info_of_catalogue, catalogues.slice(1)];
}

export const split_content_and_tile = (contexts: string[] | string): [any[], string[]] => {
  const docs: any[] = [];
  const titles: string[] = [];

  if(typeof contexts === 'string') {
    const title = contexts.split('\n')[0].trim();
    const content = contexts.split('\n')[1];

    docs.push({ title: title, document: content });
    titles.push(title);
  } else {
    contexts.map(d => {
        const title = d.split('\n')[0].trim();
        const content = d.split('\n')[1];
  
        docs.push({ title: title, document: content });
        titles.push(title);
    });
  }

  return [docs, titles];
}