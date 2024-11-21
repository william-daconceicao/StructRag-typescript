import { ChatResponse } from "ollama";
import { generateAnswer, getPromptFromFile } from "./helper.js";

export const decomposeQuery = async (query: string, kb_info: string, data_id: string): Promise<string[]> => {
  console.log(`data_id: ${data_id}, do_decompose...`);

  const prompt = await getPromptFromFile('decompose', { query, kb_info, });
  const output = (await generateAnswer(prompt.value))?.message.content;
  const subqueries = output.split("\n");

  return subqueries
}

export const extractKW = async (query: string[], subqueries: string[], chosen: string, data_id: string, extra_instruction?: string): Promise<string[]> => {
  console.log(`data_id: ${data_id}, retrieve...`)

  if (extra_instruction) {
    subqueries = subqueries.map(q => q + extra_instruction);
  }

  let subknowledges;
  if (chosen == "chunk") {
    subknowledges = retrieveChunk(query, subqueries, data_id)
  } else if (chosen == "table") {
    subknowledges = retrieveTable(query, subqueries, data_id)
  } else if (chosen == "graph") {
    subknowledges = retrieveGraph(query, subqueries, data_id)
  } else if (chosen == "algorithm") {
    subknowledges = retrieveAlgorithm(query, subqueries, data_id)
  } else if (chosen == "catalogue") {
    subknowledges = retrieveCatalogue(query, subqueries, data_id)
  } else {
    throw new Error("chosen should be in ['chunk', 'table', 'graph', 'algorithm', 'catalogue']");
  };

  return subknowledges;
};

export const mergeResult = async (query: string, subqueries: string[], subknowledges:string[], chosen: string, dataId: string): Promise<ChatResponse> => {
  console.log(`data_id: ${dataId}, do_merge...`);

  let retrieval = "";

  if (chosen === "chunk") {
      const subknowledgesString = subknowledges.join("\n");
      retrieval += `Subquery: ${query}\nRetrieval results:\n${subknowledgesString}\n\n`;
  } else if (chosen === "table") {
      subqueries.forEach((subquery, index) => {
          retrieval += `Subquery: ${subquery}\nRetrieval results:\n${subknowledges[index]}\n\n`;
      });
  } else if (chosen === "graph") {
      subqueries.forEach((subquery, index) => {
          retrieval += `Subquery: ${subquery}\nRetrieval results:\n${subknowledges[index]}\n\n`;
      });
  } else if (chosen === "algorithm") {
      subqueries.forEach((subquery, index) => {
          retrieval += `Subquery: ${subquery}\nRetrieval results:\n${subknowledges[index]}\n\n`;
      });
  } else if (chosen === "catalogue") {
      const subknowledgesString = subknowledges.join("\n");
      retrieval += `Subquery: ${query}\nRetrieval results:\n${subknowledgesString}\n\n`;
  } else {
      throw new Error("chosen should be in ['chunk', 'table', 'graph', 'algorithm', 'catalogue']");
  }

  const instruction = `1. Answer the Question based on retrieval results. 
2. Find the relevant information from given retrieval results and output as detailed, specific, and lengthy as possible. 
3. The output must be a coherent and smooth piece of text.`;
  const prompt = `Instruction:\n${instruction}\n\nQuestion:\n${query}\n\nRetrieval:\n${retrieval}`;

  return generateAnswer(prompt);
};

const retrieveChunk = async (query: string[], subqueries: string[], data_id: string): Promise<string[]> => {
  console.log(`data_id: ${data_id}, do_retrieve_chunk...`);
  const chunks = query;

  const composed_query = subqueries.join("\n");

  return Promise.all(chunks.map(async (chunk: string, c: number) => {
    console.log(`retrieve chunk ${c + 1}/${chunks.length} in chunks ..`);

    const prompt = `Instruction:\nAnswer the Query based on the given Document.\n\nQuery:\n${composed_query}\n\nDocument:\n${chunk}\n\nOutput:`;
    const tmp_output = (await generateAnswer(prompt))?.message.content;
    const title = chunk.split(":")[0];
    return `Retrieval result for ${title}: ${tmp_output}`;
  }));
};

const retrieveTable = async (query: string[], subqueries: string[], data_id: string): Promise<string[]> => {
  console.log(`data_id: ${data_id}, do_retrieve_table...`);

  const tables = query;
  const tables_content = tables.map((table: string, t: number) => `Table ${t + 1}:\n${table}\n\n`).join("");

  return Promise.all(subqueries.map(async (subquery: string, s: number) => {
    console.log(`data_id: ${data_id}, do_retrieve_table... in subquery ${s + 1}/${subqueries.length} in subqueries ..`);
    const prompt = `Instruction:\nThe following Tables show multiple independent tables built from multiple documents.\nFilter these tables according to the query, retaining only the table information that helps answer the query.\nNote that you need to analyze the attributes and entities mentioned in the query and filter accordingly.\nThe information needed to answer the query must exist in one or several tables, and you need to check these tables one by one.\n\nTables:${tables_content}\n\nQuery:${subquery}\n\nOutput:`;
    return (await generateAnswer(prompt))?.message.content;
  }));
};

const retrieveGraph = async (query: string[], subqueries: string[], data_id: string): Promise<string[]> => {
  console.log(`data_id: ${data_id}, do_retrieve_graph...`);

  const graphs = query;
  const graphs_content = graphs.join("\n\n");

  return Promise.all(subqueries.map(async (subquery: string, s: number) => {
    console.log(`data_id: ${data_id}, do_retrieve_graph... in subquery ${s + 1}/${subqueries.length} in subqueries ..`);
    const prompt = `Instruction: According to the query, filter out the triples from all triples in the graph that can help answer the query.\nNote, carefully analyze the entities and relationships mentioned in the query and filter based on this information.\n\nGraphs:${graphs_content}\n\nQuery:${subquery}\n\nOutput:`;
    return (await generateAnswer(prompt))?.message.content;
  }));
};

const retrieveAlgorithm = async (query: string[], subqueries: string[], data_id: string): Promise<string[]> => {
  console.log(`data_id: ${data_id}, do_retrieve_algorithm...`);

  const algorithms = query;
  const algorithms_content = algorithms.join("\n\n");

  return Promise.all(subqueries.map(async (subquery: string, s: number) => {
    console.log(`data_id: ${data_id}, do_retrieve_algorithm... in subquery ${s + 1}/${subqueries.length} in subqueries ..`);
    const prompt = `Instruction: According to the query, filter out information from algorithm descriptions that can help answer the query.\nNote, carefully analyze the entities and relationships mentioned in the query and filter based on this information.\n\nAlgorithms:${algorithms_content}\n\nQuery:${subquery}\n\nOutput:`;
    return (await generateAnswer(prompt))?.message.content;
  }));
};

const retrieveCatalogue = async (query: string[], subqueries: string[], data_id: string): Promise<string[]> => {
  console.log(`data_id: ${data_id}, do_retrieve_catalogue...`);

  const catalogues = query;
  const catalogues_content = catalogues.join("\n\n");

  return Promise.all(subqueries.map(async (subquery: string, s: number) => {
    console.log(`data_id: ${data_id}, do_retrieve_catalogue... in subquery ${s + 1}/${subqueries.length} in subqueries ..`);
    const prompt = `Instruction: According to the query, filter out information from the catalogue that can help answer the query.\nNote, carefully analyze the entities and relationships mentioned in the query and filter based on this information.\n\nCatalogues:${catalogues_content}\n\nQuery:${subquery}\n\nOutput:`;
    return (await generateAnswer(prompt))?.message.content;
  }));
};