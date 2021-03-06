process.env.UV_THREADPOOL_SIZE = 10;

let DataManager = require('./Includes/DataManager.js');
let DataAPI = require('./Includes/DataAPI.js');
let Schedule = require('node-schedule');
let config = require("./data/config.json");

let Facebook = require("./Includes/Facebook.js");

//Ende imports

let appToken = config.appId + "|" + config.appSecret; 
let trumpNewsId = config.trumpNewsId;
let trumpNewsToken = config.trumpNewsToken;

let fb = new Facebook(config.appId, config.appSecret);
//fb.extendToken(trumpNewsToken);

let storage = require("node-persist");

let lastPosts = [];

let dm = new DataManager(config.redisPort, function()
{
    let api = new DataAPI(dm.client);
    
    let updateBot = function(){
        fb.downloadPosts(trumpNewsId, function(data, prev, next){
            let pagePosts = data;

            let postable = [];
            let done = 0;
            api.getLinksToWords(["trump"], function(res){ //Other words too?
                let todo = (res.length > 200 ? 200 : res.length);

                for(let r = 0; r < todo; r++)
                {
                    api.getLink(res[r], function(link){
                        if(link.sourceId != "dm") //Links from that site are buggy
                        {
                            let found = false;
                            for(let l in pagePosts)
                            {
                                if(pagePosts[l].message == link.title)
                                {
                                    found = true;
                                    break;
                                }
                            }

                            for(let l in lastPosts)
                            {
                                if(lastPosts[l].message == link.title || lastPosts[l].url == link.url)
                                {
                                    found = true;
                                    break;
                                }
                            }

                            if(found == false)
                                postable.push(link); //Postable
                        }

                        done++;
                        if(done >= todo)
                        {
                            postable = postable.sort(function(a, b){return parseInt(b.date) - parseInt(a.date)});

                            if(postable.length >= 1)
                            {
                                console.log("Posting: ");
                                console.log(postable[0]);
                                fb.postTo(trumpNewsId, postable[0].title, postable[0].url, trumpNewsToken);
                                lastPosts.push({message:postable[0].title, url:postable[0].url});

                                while(lastPosts.length > 200)
                                    lastPosts.shift();

                                storage.setItem('trumpNewsLastPosts',JSON.stringify(lastPosts))
                                .then(function() {
                                    console.log("Saved lastPosts");
                                });
                            }
                            else
                            {
                                console.log("Nothing to post anymore :(");
                            }
                        }
                    });
                }
            });
        });
    }

    
    storage.init().then(function() {
    
        storage.getItem('trumpNewsLastPosts')
        .then(function(value) {
            lastPosts = JSON.parse(value);
            updateBot(); 
        });

    });

    //Every 10 minutes
    Schedule.scheduleJob('10 * * * *', updateBot);
    Schedule.scheduleJob('20 * * * *', updateBot);
    Schedule.scheduleJob('30 * * * *', updateBot);
    Schedule.scheduleJob('40 * * * *', updateBot);
    Schedule.scheduleJob('50 * * * *', updateBot);
    Schedule.scheduleJob('0 * * * *', updateBot);
});