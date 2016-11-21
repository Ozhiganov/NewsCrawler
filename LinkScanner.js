var cheerio = require('cheerio');
var Link = require('./Link.js');

module.exports = class LinkScanner{

    constructor()
    {
        this.links = [];
        this.okayRecieved = 0;
        this.recieved = 0;
    }
    
    onGotPage(html, source, url)
    {
        let $ = cheerio.load(html);
        
        //$(".headline a").css('background-color', 'red');
        //$("h1 a").css('background-color', 'red');
        //Todo: crawling component

        var foundLinks = 0;

        var theBase = this;

        $("a").each(function( index ) {
            if($( this ).text().length > 20 && ($(this).text().match(/([\S]( |-)[\S])/g)||[]).length > 2)
            {
                var fullUrl = $(this).attr("href");
                var r = new RegExp('^(?:[a-z]+:)?//', 'i');
                if(r.test(fullUrl) == false)
                    fullUrl = url + fullUrl;
                
                var link = new Link($(this).text(), undefined, fullUrl, source);
                if(link.isValid())
                {
                    theBase.links.push(link);
                    foundLinks++;
                }
            }
        });

        this.recieved++;

        if(foundLinks > 10)
        {
            this.okayRecieved++;
            console.log("OK     Found links: " + foundLinks + "     " + url);        
        }
        else
        {
            console.log("Error  Found links: " + foundLinks + "     " + url);                    
        }
    }

    getLinks()
    {
        return this.links;
    }

    printScore()
    {
        console.log("Score: " + this.okayRecieved + "/" + this.recieved + " =" + (this.okayRecieved / this.recieved));
    }
}