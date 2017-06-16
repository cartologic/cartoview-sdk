export default class TaskService{
  constructor(endpointUrl){
    this.url=endpointUrl;
  }
  getTaskList(){
    return fetch(this.url).then(function(response) {
      if (response.status == 200)
        return response.json();
      else
        throw new Error('Something went wrong on api server!');
      }
    )
  }
}
