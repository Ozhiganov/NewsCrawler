const elasticsearch = require('elasticsearch');

module.exports = class WikimediaAPI{

  constructor(){
    this.client = new elasticsearch.Client({
      host: 'localhost:9200',
      log: 'error'
    });
  }

  processSearchResult(term, result){
    let exactHits = [];
    let notExactHits = [];
    let allHits = [];

    //console.log("Num Hits: " + result.hits.hits.length);

    for(let h in result.hits.hits){
      let hit = result.hits.hits[h]._source; 
      let isExact = false;

      for(let l in hit.labels){
        if(hit.labels[l].toLowerCase() == term.toLowerCase())
        {
          isExact = true;
          break;
        }
      }
      
      if(isExact == false)
        for(let a in hit.aliases){
          if(hit.aliases[a].toLowerCase() == term.toLowerCase())
          {
            isExact = true;
            break;
          }
        }
      
      if(isExact)
        exactHits.push(hit);
      else
        notExactHits.push(hit);

      allHits.push(hit);
    }

    return {exact:exactHits, notexact:notExactHits, all:allHits};
  }

  getLinkedEntities(entity){

    let propertyBlacklist = {"P1889":"Different from", "P31":"Instance of"};

    let entities = [];
    for(let c in entity.claims)
    {
      if(entity.claims[c] != undefined)
        for(let snak in entity.claims[c])
        {
          let mainsnak = entity.claims[c][snak].mainsnak;
          if(mainsnak.datatype == "wikibase-item" && mainsnak.datavalue.type == "wikibase-entityid"){

            let prefix;
            if(mainsnak.datavalue.value['entity-type'] == "property")
              prefix = "P";
            
            if(mainsnak.datavalue.value['entity-type'] == "item")
              prefix = "Q";

            if(prefix == undefined)
              throw new Error(mainsnak.datavalue.value['entity-type'] + " wierd type!");
            
            if(propertyBlacklist[mainsnak.property] == undefined)
              entities.push(prefix + mainsnak.datavalue.value['numeric-id']);
          }
        }
    }

    return entities;
  }

  search(term, callback){
    let theBase = this;
    this.client.search({index:"wikidata", type:"Q", body:{
      size: 200,
      from: 0,
      query: {
        query_string: {
          query: '(aliases:"'+term+'" OR labels:"'+term+'")',
          "use_dis_max" : true
        }
      }
    }}).then(result => {
      let processed = theBase.processSearchResult(term, result);
      callback(processed);
    });
  }

}