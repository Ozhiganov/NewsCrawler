var sources = require("./data/sources.json");
var articles = require("./data/articles.json");

var Download =  require('./Includes/Download.js');
var ArticleScanner = require('./Includes/ArticleScanner.js');
var LinkScanner = require('./Includes/LinkScanner.js');
var Article = require('./Includes/Article.js');
var Link = require('./Includes/Link.js');
var DataManager = require('./Includes/DataManager.js');

//End imports

var dm = new DataManager(function(){
    
    dm.getUnprocessedLinks(function(link, linkId){

        console.log("Processing link: " + linkId);
        processLink(link, linkId);        

    });

    //dm.disconnect();
});

function processLink(link, linkId)
{
    var words = link.getWords();
    var day = Math.floor(link.date / 60 / 60 / 24);
    checkValue(day, "day", day);

    for(var i = 0; i < words.length; i++)
    {
        var word = words[i];

        checkValue(word, "word", words);

        //Count of all seen words
        dm.client.zincrby("generalWordCount", 1, word);

        //All the words for a given day
        dm.client.zincrby("dayWordCount:" + day, 1, word);       
        
        //The count history over time for a given word 
        dm.client.zincrby("wordOnDate:" + word, 1, day); 

        //The words that occure right of a given word
        if(i+1 < words.length)
        {
            var rightWord = words[i + 1];
            checkValue(rightWord, "rightWord " + (i + 1), words);
            
            dm.client.zincrby("rnWords:" + word, 1, rightWord);
        }

        //Inverted index to find newest articles to word
        dm.client.zadd("invIndex:"+word, day, linkId);
    }

    //Same headline count
    for(var i = 0; i < words.length; i++)
    {
        var firstWord = words[i];
        for(var j = i + 1; j < words.length; j++)
        {
            var secondWord = words[j];

            checkValue(firstWord, "firstWord", firstWord);
            checkValue(secondWord, "secondWord", secondWord);

            //Given word
            dm.client.zincrby("sameHeadlineCount:" + firstWord, 1, secondWord);
            dm.client.zincrby("sameHeadlineCount:" + secondWord, 1, firstWord); 

            //Over time by given word
            dm.client.zincrby("daySameHeadlineCount:" + day + ":" + firstWord, 1, secondWord);
            dm.client.zincrby("daySameHeadlineCount:" + day + ":" + secondWord, 1, firstWord); 
        }
    }

    dm.client.incrby("totalWordsCountBySource:"+link.sourceId, words.length);
    dm.client.incrby("totalWordsCount", words.length);
    dm.client.incrby("totalWordCountOnDay:" + day, words.length);
}

function checkValue(value, msg, extra)
{
    if(value == null || value == '' || value == " " || typeof value === 'undefined' || value == false)
    {
        console.log(extra);
        console.log( "->" + msg );
    }    
}