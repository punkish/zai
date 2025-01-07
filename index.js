import { RAGApplicationBuilder, TextLoader } from '@llm-tools/embedjs';
import { OllamaEmbeddings, Ollama } from '@llm-tools/embedjs-ollama';
// import { WebLoader } from '@llm-tools/embedjs-loader-web';
// import { XmlLoader } from '@llm-tools/embedjs-loader-xml';
//import { HNSWDb } from '@llm-tools/embedjs-hnswlib';
import { LibSqlStore, LibSqlDb } from '@llm-tools/embedjs-libsql';
const ollama = 'http://localhost:11434';
import { createClient } from "@libsql/client";
const zenodeo = '../zenodeo3/data/db/zenodeo.sqlite';
const zenodeodb = createClient({
    url: `file:${zenodeo}`
});

// https://github.com/ashryanbeats/embedjs-rag-web/blob/main/index.js
// async function loadResources(ragApplication, dataUrls) {
//     const loaderSummaries = await Promise.all(
//         dataUrls.map(async (url) => {
//             console.log(`Adding loader for: ${url}`);
            
//             const loaderSummary = await ragApplication.addLoader(
//                 new XmlLoader({ filePathOrUrl: '/path/to/file.xml' })
//             );
    
//             return loaderSummary;
//       })
//     );
  
//     console.log(
//         "\nLoader summaries:\n",
//         loaderSummaries.map((summary) => JSON.stringify(summary)).join("\n")
//     );
  
//     return loaderSummaries;
// }


async function buildApp() {
    console.log('building app');

    const app = await new RAGApplicationBuilder()
        .setModel(new Ollama({ modelName: "llama3.2", baseUrl: ollama }))
        .setEmbeddingModel(
            new OllamaEmbeddings({ 
                model: 'nomic-embed-text', 
                baseUrl: ollama 
            })
        )
        .setVectorDatabase(new LibSqlDb({ path: `./v.db` }))
        .setStore(new LibSqlStore({ path: './s.db' }))
        .build();

    return app;
}

async function loadData(app, num, start = 0, total) {
    let end = start + num - 1;

    if (end > total) {
        end = total;
    }

    const label = `loading ${start}-${end} treatments`;
    console.time(label);
    
    
    const sql = `SELECT fulltext FROM treatments WHERE id BETWEEN ${start} AND ${end}`;
    const result = await zenodeodb.execute(sql);

    for (const row of result.rows) {
        await app.addLoader(new TextLoader({ text: row.fulltext }));
    }

    console.timeEnd(label);

    if (end < total) {
        start = end + 1;
        loadData(app, num, start, total);
    }

}

async function queryData(app, queries) {

    for (const query of queries) {
        console.time(query)
        const ans = await app.query(query)
        console.timeEnd(query);
        console.log('-'.repeat(80));
        console.log(ans.content);
        console.log('='.repeat(80), '\n');
    }
}

const queries = [
    'How do you distinguish Eudontomyzon graecus from its European congeners?',
    'What is the new proposed common name for Eudontomyzon hellenicus?',
    'What is the Macedonia brook lamprey?',
    'What is the etymology of Torrenticola larvata?',
    'What does the abbreviation Cunclyp mean?',
    'When did Carvalhoma Slater & Gross publish their paper?',
    'What species are named after Weir?',
    'Are there any species with yellow maxillary and mandibular plates?',
    'Where is the Slender Yellow Bat found?',
    'Where were the New Brunswick specimens were found?',
    'What is a taxonomic treatment?',
    'Who created the concept of a taxonomic treatment?'
];

function getTotal() {
    return 2000;
}

const app = await buildApp();
const total = getTotal();
const num = 500;
//await loadData(app, num, 0, total);
await queryData(app, queries);