module.exports = class HeadlineWriter{
    constructor(api)
    {
        this.api = api;
    }

    getProccessedHeadlineForWord(word, countThreshold, chanceThreshold, callback)
    {
        let theBase = this;
        this.getHeadlineForWord(word, countThreshold, chanceThreshold, function(headline)
        {
            let strHeadline = [];
            for(let k in headline)
                strHeadline.push(headline[k].word);

            theBase.api.getSameHeadlineCountForDayAndWord(theBase.getToday(), strHeadline, function(related){
                    
                let b = 0;
                while(related.length > b && related[b].wightedScore >= chanceThreshold / 10 && headline.length <= 2){
                    if(strHeadline.indexOf(related[b].word) == -1)
                        headline.push({"word":related[b].word, "method":"rel", "score":related[b].score, "count":related[b].count});
                    b++;
                }

                let filtered = [];
                for(let c in headline)
                    if(headline[c].word.length >= 2)
                        filtered.push(headline[c]);

                let stringArray = [];
                for(let c in filtered)
                    if(filtered.length >= 2)
                        stringArray.push(filtered[c].word);
                
                //Problem with sync
                if(stringArray.length >= 2)
                    callback(stringArray);
                else
                    callback();
            });
        });
    }

    getHeadlineForWord(word, thresholdCount, thresholdChance, callback)
    {
        let headline = [{"word":word, "method":"initial"}];
        let theBase = this;

        theBase.addManyLeft(headline, theBase.api, thresholdCount, thresholdChance, function(leftCompleteHeadline){
            theBase.addManyRight(leftCompleteHeadline, theBase.api, thresholdCount, thresholdChance, function(completeHeadline){
                callback(completeHeadline);
            });
        });
    }

    addWordRight(array, api, thresholdCount, thresholdChance, candidates, callbackSuccess, callbackFailed)
    {
        let theBase = this;
        if(array[array.length - 1] == "#end#")
            callbackFailed(array);
        else
        {
            api.getRightNeighbourForWordOnDay(array[array.length - 1].word, theBase.getToday(), function(rn){                
                let choosenRight;

                rn = rn.sort(function(a, b){return b.count - a.count;});

                for(let i in rn)
                {
                    if(rn[i].count >= thresholdCount && rn[i].score >= thresholdChance && candidates.indexOf(rn[i].word) > -1){
                        choosenRight = {word:rn[i].word, "method":"r", "score":rn[i].score, "count":rn[i].count};
                        break;
                    }

                    if(rn[i].count < thresholdCount)
                        break;
                }

                if(choosenRight != undefined){
                    array.push(choosenRight);
                    callbackSuccess(array);
                }
                else
                    callbackFailed(array);
            });
        }
    }

    addWordLeft(array, api, thresholdCount, thresholdChance, candidates, callbackSuccess, callbackFailed)
    {
        let theBase = this;
        if(array[0] == "#beginning#")
            callbackFailed(array);
        else
        {
            api.getLeftNeighbourForWordOnDay(array[0].word, theBase.getToday(), function(ln){                
                let choosenLeft;

                ln = ln.sort(function(a, b){return b.count - a.count;}); //Sort to count not score

                for(let i in ln)
                {
                    if(ln[i].count >= thresholdCount && ln[i].score >= thresholdChance && candidates.indexOf(ln[i].word) > -1){                                
                        choosenLeft = {word:ln[i].word, "method":"l", "score":ln[i].score, "count":ln[i].count};
                        break;
                    }

                    if(ln[i].count < thresholdCount)
                        break;
                }

                if(choosenLeft != undefined){
                    array.unshift(choosenLeft);
                    callbackSuccess(array);
                }
                else
                    callbackFailed(array);
            });
        }
    }

    getToday(){
        return Math.floor(Date.now() / 1000 / 60 / 60 / 24);
    }

    addManyInternal(headline, api, thresholdCount, thresholdChance, addManyFunction, callback)
    {
        let theBase = this;

        let strHeadline = [];
        for(let k in headline)
            strHeadline.push(headline[k].word);

        this.api.getSameHeadlineCountForDayAndWord(theBase.getToday(), strHeadline, function(candidatesResult){
            let candidates = [];
            for(let a in candidatesResult)
                candidates.push(candidatesResult[a].word);

            addManyFunction(headline, api, thresholdCount, thresholdChance, candidates,
                function(newHeadline){
                    //Success try again
                    theBase.addManyLeft(newHeadline, api, thresholdCount, thresholdChance, callback);
                }, callback);
        });
    }

    addManyLeft(headline, api, thresholdCount, thresholdChance, callback)
    {
        this.addManyInternal(headline, api, thresholdCount, thresholdChance, this.addWordLeft.bind(this), callback);
    }

    addManyRight(headline, api, thresholdCount, thresholdChance, callback)
    {
        this.addManyInternal(headline, api, thresholdCount, thresholdChance, this.addWordRight.bind(this), callback);
    }
}