process.env.UV_THREADPOOL_SIZE = 10;

let Sources = require("./data/sources.json");
//let Articles = require("./data/articles.json");

let Download =  require('./Includes/Download.js');
let ArticleScanner = require('./Includes/ArticleScanner.js');
let LinkScanner = require('./Includes/LinkScanner.js');
let Article = require('./Includes/Article.js');
let Link = require('./Includes/Link.js');
let DataManager = require('./Includes/DataManager.js');

let DataAPI = require('./Includes/DataAPI.js');

let Express = require('express');
let ExpressRest = require('express-rest');
 
let WebApi = require('./Includes/WebAPI.js');
let ProcessLink = require('./Includes/ProcessLink.js');

let Schedule = require('node-schedule');

let config = require("./data/config.json");

//Ende imports

console.log("Path is: " + __dirname);

let dm = new DataManager(config.redisPort, function()
{
    let api = new DataAPI(dm.client);
    
    let exp = Express();
    let rest = ExpressRest(exp);

    WebApi.createWebApi(exp, rest, api, 200, Sources);

    let downloadLinks = function(){
        //DownloadLinks, send to scanner
        for (i = 0; i < Sources.length; i++)
        {
            console.log("Download: " + Sources[i].name);
            new Download(s, Sources[i].id, Sources[i].url);
        }
    };

    let processLinks = function(){
        dm.getArticleToProcess(function(link, id){
            console.log("Process: " + id);
            ProcessLink.processLink(link, id, dm);
            processLinks();      
        });
    };

    let listener = exp.listen(config.httpPort, function(){
        console.log('Listening on port ' + listener.address().port);
    });

    //LinkScanner for Download
    let s = new LinkScanner(function(sourceId, links){
        dm.saveCurrentScan(sourceId, links);
    });

    Schedule.scheduleJob('*/10 * * * *', downloadLinks);
    Schedule.scheduleJob('5-59/10 * * * *', processLinks);

    //Every day
    Schedule.scheduleJob('15 23 * * *', function(){
        //RolloverBlacklist
        for (i = 0; i < Sources.length; i++)
        {
            console.log("Switching blacklist: " + Sources[i].name);
            dm.rolloverBlacklist(Sources[i].id);        
        }

        dm.deleteDetails();
    });

    downloadLinks();
    setTimeout(processLinks, 1000 * 10);

    //dm.disconnect();
});