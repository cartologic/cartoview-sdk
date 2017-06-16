import SafeUrlAssembler from 'safe-url-assembler';
import {hasTrailingSlash,addSlash} from '../helpers/helpers';

export class RestAssembler {
  constructor(apiBaseUrl){
    this.api=SafeUrlAssembler(addSlash(apiBaseUrl) );
  }

  detailsUrl(url,id,filters){
    return this.api.segment(addSlash(url)+':id').param('id',id).query(filters).toString()
  }
  listUrl(url){
    return this.api.segment(addSlash(url)').toString()
  }

}
export class GeoserverAssembler {
  constructor(geoserverBaseUrl){
    this.api=SafeUrlAssembler(addSlash(apiBaseUrl));
  }
  getUrl(url,filters){
    return this.api.segment(addSlash(url)).query(filters).toString()
  }

}
