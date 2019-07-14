import style from "./html/style.css";
const d3 = require('d3')
// import { drawMatches } from './js/drawing'
// require('!style-loader!css-loader!marx-css/css/marx.css')

import simulation, { ticked } from './js/simulation.js'
import { s } from './js/state'

d3.json('./docs/network.json')
.catch(error => console.error(error))
.then(graph => {
    s.setCanvas()
    s.setGraph(graph)
    s.setPairs(graph.nodes)
    s.setScreen()
    simulation()
})

// const searchField = d3.select("#searchField").on('input', function(e){ 
//     const matchingNodes = graph.nodes.filter(d => d.id.toLowerCase().indexOf(this.value.toLowerCase()) !== -1);
//     console.log("matching", matchingNodes);
//     s.setMatches(matchingNodes);
//     ticked();
// });
// console.log(searchField);