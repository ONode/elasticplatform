const elasticsearch = require('elasticsearch');
//const wordfreqProgram = require('wordfreq');
const indexName = "logstash-legcoxx-";
const elasticClient = new elasticsearch.Client({
    host: getBonsaiUrl(),
    log: 'info'
});
function isESReady() {
    return getBonsaiUrl() != '';
}
function getBonsaiUrl() {
    return process.env.BONSAI_URL || '';
}
exports.isESReady = isESReady;
/**
 * Delete an existing index
 */
function deleteIndex() {
    return elasticClient.indices.delete({
        index: indexName
    });
}
exports.deleteIndex = deleteIndex;

/**
 * create the index
 */
function initIndex() {
    return elasticClient.indices.create({
        index: indexName
    });
}
exports.initIndex = initIndex;

/**
 * check if the index exists
 */
function indexExists() {
    return elasticClient.indices.exists({
        index: indexName
    });
}
exports.indexExists = indexExists;

function initMapping(legco_year) {
    elasticClient.ping({
            requestTimeout: 30000,
            hello: "elasticsearch"
        },
        function (error) {
            if (error) {
                console.error('elasticsearch cluster is down!');
            } else {
                console.log('All is well');
            }
        }
    );

    return elasticClient.indices.putMapping({
        index: indexName + legco_year,
        type: "document",
        body: {
            properties: {
                title: {type: "string", "analyzer": "english"},
                content: {type: "string"},
                source: {type: "string"},
                suggest: {
                    type: "completion",
                    analyzer: "simple",
                    search_analyzer: "simple",
                    payloads: true
                }
            }
        }
    });
}
exports.initMapping = initMapping;

function addDocFullText(document) {
    return elasticClient.index({
        index: indexName,
        type: "document",
        body: {
            title: document.title,
            content: document.content,
            source: document.src,
            suggest: {
                input: document.title.split(" "),
                output: document.title,
                payload: document.metadata || {}
            }
        }
    });
}
exports.addDocFullText = addDocFullText;

function addDocument(document) {
    if (document.content) {
        console.log(document.content);
    }
    return elasticClient.index({
        index: indexName,
        type: "document",
        body: {
            title: document.title,
            content: document.content,
            suggest: {
                input: document.title.split(" "),
                output: document.title,
                payload: document.metadata || {}
            }
        }
    });
}
exports.addDocument = addDocument;

function getSuggestions(input) {
    return elasticClient.suggest({
        index: indexName,
        type: "document",
        body: {
            docsuggest: {
                text: input,
                completion: {
                    field: "suggest",
                    fuzzy: true
                }
            }
        }
    })
}

function importdata() {
//Add a few book titles for the autocomplete
//elasticsearch offers a bulk functionality as well, but this is for a different time
    indexExists().then(function (exists) {
        if (exists) {
            return deleteIndex();
        }
    }).then(function () {
        return initIndex().then(initMapping).then(function () {
            var promises = [
                'Thing Explainer',
                'The Internet Is a Playground',
                'The Pragmatic Programmer',
                'The Hitchhikers Guide to the Galaxy',
                'Trial of the Clone',
                'All Quiet on the Western Front',
                'The Animal Farm',
                'The Circle'
            ].map(function (bookTitle) {
                return addDocument({
                    title: bookTitle,
                    content: bookTitle + " content!",
                    metadata: {
                        titleLength: bookTitle.length
                    }
                });
            });
            return Promise.all(promises);
        });
    });
}
exports.importdat = importdata;
exports.getSuggestions = getSuggestions;