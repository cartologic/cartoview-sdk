export default class ProfileService{
  constructor(endpointUrl){
    this.url=endpointUrl;
    this.profiles=[];
  }
  getProfiles(){
    return fetch(this.url).then(function(response) {
      if (response.status == 200)
        return response.json();
      else
        throw new Error('Something went wrong on api server!');
      }
    )
  }
  filterByID(){
    let selected=this.profiles.map((profile)=>{
      if (appConfig.taskManager.surveyors.indexOf(profile.id) != -1) {
        return profile
      }
    })
    return selected
  }
  ProfileList(){
    if(this.profiles.length!=0){
      this.filterByID()

    }else{
      this.getProfiles().then((res)=>{
        this.profiles=res.objects;
        this.filterByID()
      })
    }

  }

}
