
/////////////////////////////
// Libraries
/////////////////////////////

const beautify = require('beautify')
const combinatorics = require('js-combinatorics')
const fs = require('fs')
const path = require('path')
const keyword_extractor = require("keyword-extractor")
const natural = require('natural')
const tfidf = new natural.TfIdf() // term frequency inverse doc frequency




/////////////////////////////
// Reading dics.json
/////////////////////////////

fs.readFile(__dirname + '/src/data/docs-inferno.json', (err, data) => {
    if (err) throw err

    docs = JSON.parse(data)

    // Assemble by advisor
    let advisors = []
    for (let doc of docs) {
        // console.log(doc)
        if (!doc.advisors) continue // Skip empty advisors
        for (let advisor of doc.advisors) {
            const hasAdvisor = advisors.some(adv => adv.id === advisor)
            if (hasAdvisor) {
                // Append text to the advisor
                let _advisor = advisors.filter(adv => adv.id === advisor)
                _advisor[0].docs++
                _advisor[0].text += doc.title + ' ' + doc.text + ' '
            } else {
                // Create the advisor
                advisors.push({
                    id: advisor,
                    docs: 1,
                    text: doc.title + ' ' + doc.text + ' ',
                })
                console.log('Created advisor', advisors.length)
            }
        }
    }

    // Merging mispelled authors
    // for (let i = 0; i < advisors.length - 1; i++) {
    //     for (let j = i + 1; j < advisors.length; j++) {
    //         if (natural.DiceCoefficient(advisors[i].id, advisors[j].id) > .5) {
    //             // console.log(advisors[i].id, ' - ', advisors[j].id,
    //             //     natural.DiceCoefficient(advisors[i].id, advisors[j].id))
    //             // console.log(advisors[i])
    //             // Increase counter
    //             advisors[i].docs += advisors[j].docs
    //             // Merge texts
    //             advisors[i].text += ' ' + advisors[j].text
    //             // Remove second advisor
    //             advisors = advisors.slice(0, j).concat(advisors.slice(j + 1, advisors.length))
    //             // Reset j position
    //             j = j - 1
    //             // console.log(advisors[i])
    //             console.log('Reducing advisors', advisors.length)
    //         }

    //     }
    // }

    // Remove authors with a few documents
    // for (let i = 0; i < advisors.length; i++) {
    //     if ( advisors[i].docs < 2 )
    //     advisors = advisors.slice(0, i).concat(advisors.slice(i + 1, advisors.length))
    // }

    // Set items for nodes
    const items = advisors

    // Tokenization
    console.log('Tokenization')
    // natural.PorterStemmer.attach() // Perter stemmer
    natural.LancasterStemmer.attach() // Lancaster stemmer
    items.forEach(item => {
        item.tokens = item.text.tokenizeAndStem()
    })

    // Keyword extractor
    console.log('Keyword extraction')
    items.forEach(item => {
        item.keywords = keyword_extractor.extract(item.text, {
            language: "english",
            remove_digits: true,
            return_chained_words: false,
            return_changed_case: true,
            remove_duplicates: true,
            return_max_ngrams: false,
        })
    })

    // Lexical Analysis
    console.log('Lexical Analysis')
    const maxLimit = 7 // Limit for keywords
    items.forEach(item => tfidf.addDocument(item.text)) // Send text
    // items.forEach(item => tfidf.addDocument(item.tokens)) // Send tokens
    // items.forEach(item => tfidf.addDocument(item.keywords)) // Send keywords

    console.log('Writing Lexical Analysis')
    items.forEach((item, i) => { // Writing computation terms in items
        item.terms = tfidf.listTerms(i)
            .reduce((obj, element) => {
                if (element.tfidf > maxLimit)
                    obj[element.term] = element.tfidf
                return obj
            }, {})
    })




    /////////////////////////////
    // Set pairs
    /////////////////////////////

    console.log('Set pairs')

    const pairs = combinatorics.bigCombination(items, 2)




    /////////////////////////////
    // Set nodes and edges
    /////////////////////////////

    console.log('Set nodes and edges')

    const network = {
        nodes: items.map(item => {
            return {
                'id': item.id,
                'docs': item.docs,
                'tokens': item.tokens,
                'keywords': item.keywords,
                'terms': item.terms,
            }
        }),
        links: []
    }

    pairs.forEach(pair => {

        const terms = Object.keys(pair[0].terms)
            .filter(n => Object.keys(pair[1].terms).includes(n))

        terms.forEach(term => {

            // Check of the link exists or not
            const link = network.links.filter(link =>
                link.s === pair[0].id && link.t === pair[1].id
            )

            if (link.length > 0) {
                // console.log()
                // console.log(link[0].v)
                link[0].v += pair[0].terms[term] + pair[1].terms[term]
                // console.log(link[0].v)
            } else {
                network.links.push({
                    s: pair[0].id,
                    t: pair[1].id,
                    v: pair[0].terms[term] + pair[1].terms[term],
                })
            }


        })
    })

    // Normalizing values between [0,1]
    const max = network.links.reduce((max, link) => max > link.v ? max : link.v, 0)
    network.links.forEach(link => link.v = link.v / max)




    /////////////////////////////
    // Report
    /////////////////////////////

    console.log()
    console.log('        Network =>')
    console.log('                    pairs :', pairs.length)
    console.log('                    links :', network.links.length)
    console.log('                    nodes :', network.nodes.length)




    /////////////////////////////
    // Writing network.json
    /////////////////////////////

    console.log()
    console.log('          Files =>')

    const directory = './src/data'
    const format = json => beautify(JSON.stringify(json), { format: 'json' })
    const setComma = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    let fileName

    fileName = path.resolve(__dirname, `${directory}/network.json`)
    fs.writeFile(fileName, format(network), err => {
        if (err) throw err
        console.log('                  network :', setComma(format(network).length), 'kb /', network.nodes.length, 'records')
    })

    fileName = path.resolve(__dirname, `${directory}/advisors.json`)
    fs.writeFile(fileName, format(advisors), err => {
        if (err) throw err
        console.log('                 advisors :', setComma(format(advisors).length), 'kb /', advisors.length, 'records')
    })


    // End of computation


})





