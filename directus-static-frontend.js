const express = require('express')
const app = express()
const fs = require('fs')
require('isomorphic-fetch')
app.use(express.json())
app.listen(3000)

let endpoint = "http://localhost:8055/graphql"
let headers = {"Content-Type": "application/json", "Authorization": "Bearer XXXXX" }
let path = "test/"

app.post( '/', ( req, res ) => {
    res.sendStatus(202)

    const event = req.body['event']
    const status = req.body['payload']['status']
    const rename = req.body['payload']['slug']

    if (event === 'items.delete') {    deleteItem()  }
    if (event === 'items.update' && (status === 'draft' || status === 'archived')) {    removeItem()   }
    if (event === 'items.update' && rename) {    renameItem()    }
    if (event === 'items.create' || event === 'items.update') {    updateItem()   }
    updateIndex()

    function removeItem() {
        let uuid = req.body['keys'][0]
        let request = {method: "POST", headers, body: JSON.stringify({
                query: `query {articles (filter: { id: { _eq: "${uuid}" } }) {slug}}`
        })}
        fetch(endpoint, request).then(response => response.json()).then(response => {
            let slug = response.data['articles'][0]['slug']
            fs.unlink(path + slug + '.html', function(err){})
        })
    }

    function deleteItem() {
        let uuid = req.body['payload']
        let request = {method: "POST", headers, body: JSON.stringify({
                query: `query {revisions(filter: {item: {_eq: "${uuid}"}} sort:["-activity"] limit:1){data}}`
            })}
        fetch(endpoint + '/system', request).then(response => response.json()).then(response => {
            let slug = response['data']['revisions'][0]['data']['slug']
            fs.unlink(path + slug + '.html', function(err){})
        })
    }

    function renameItem() {
        let uuid = req.body['keys'][0]
        let request = {method: "POST", headers, body: JSON.stringify({
                query: `query {revisions(filter: {item: {_eq: "${uuid}"}} sort:["-activity"] limit:1 offset:1){data}}`
            })}
        fetch(endpoint + '/system', request).then(response => response.json()).then(response => {
            let slug = response['data']['revisions'][0]['data']['slug']
            let output = '<a href="/' + rename + '">' + slug + '.html</a>'
            fs.unlink(path + slug + '.html', function(err){})
            fs.writeFile(path + slug + '.html', output, {flag: 'w+'}, function(err){})
        })
    }

    function updateItem() {
        let uuid = req.body['key'] || req.body['keys'][0]
        let request = {method: "POST", headers, body: JSON.stringify({
                query: `query {articles (filter: { id: { _eq: "${uuid}" } }) {id slug headline content status}}`
            })}
        fetch(endpoint, request).then(response => response.json()).then(response => {
            let result = response.data['articles'][0]
            let status = result['status']
            let slug = result['slug']
            let headline = result['headline']
            let content = result['content']
            let output = '<h1>' + headline + '</h1>' + content;
            if (status === 'published') {
                fs.writeFile(path + slug + '.html', output, {flag: 'w+'}, function(err){})
            }
        })
    }

    function updateIndex() {
        let request = {method: "POST", headers, body: JSON.stringify({
                query: `query {articles (filter: {status: { _eq: "published" }} sort:["-published"] limit:10) {slug headline}}`
        })}
        fetch(endpoint, request).then(response => response.json()).then(response => {
            let results = response.data['articles']
            let output = ''
            results.forEach(function (result) {
                let slug = result['slug']
                let headline = result['headline']
                output += '<p><a href="/' + slug + '">' + headline + '</a></p>'
        })
            fs.writeFile(path + 'index.html', output, {flag: 'w+'},function(err){})
        })
    }
})