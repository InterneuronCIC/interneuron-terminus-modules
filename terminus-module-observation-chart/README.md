<h1>Terminus - Observations Module</h1>   
> Observations module in Terminus allows recording patient observations and calculate NEWS Scores. The module visualizes the observations on charts built on D3.js




## Prerequisites

**Development**

```
1. Visual Studio Community / Visual Studio Code
2. Angular CLI
3. Synapse Identity Server
4. Synapse Dynamic API
```

**Deployment** [windows]

```
1. IIS 7 or higher
2. Terminus Framework 
3. Synapse Identity Sever
4. Synapse Dynamic API
```



## Configure

#### Install Angular CLI and install packages

1. Download and install Node package manager on this link [NPM](https://www.npmjs.com/get-npm)

2. Follow the instructions on this link to install [Angular CLI](https://angular.io/cli)

3. Open the solution in Visual Studio and right click on the solution and open command prompt

4. Run npm install to install all dependencies. 

   ```
   npm install
   ```

   


#### Application Development and Deployment 

This module is packaged as an Angular Element [a web component] to deploy into Terminus framework. 

To run and debug the application in development mode these settings needs to be done 



##### Develop and debug in Visual studio

These settings needs to be done before the application could be locally run via angular cli. 

**1. Patient identifier in appcomponent.ts**

​	Open appcomponent.ts and uncomment below lines and provide a personId from the core.person entity. 

```typescript
  encounterLoadComplete() {
// commment out below lines to push to framework
this.appService.personId = "17775da9-8e71-4a3f-9042-4cdcbf97efec";
this.initConfig(null);
 }
```

**2. Getting an auth. token from Synapse Identity Server - apirequest.service.ts**

Comment out the below lines in Services/apirequest.service.ts 

```json
 //return from(this.appService.apiService.getRequest(uri));

 //return from(this.appService.apiService.postRequest(uri, body));

 //return from(this.appService.apiService.deleteRequest(uri));
```

Uncomment the below lines in Services/apirequest.service.ts 

```json
return from(this.authService.getToken().then((token) => { return this.callApiGet(token, uri); }));

return from(this.authService.getToken().then((token) => { return this.callApiPost(token, uri, body); }));

return from(this.authService.getToken().then((token) => { return this.callApiDelete(token, uri) }));

```

**3. Bootsrapping  a component in appmodule.ts**

The bootstrap array should contain the AppComponent.

```json
  bootstrap: [AppComponent],
```

**4. Run the app via angular cli**

In Visual Studio right click on the solution and open developer command prompt. Run the below commands and then navigate to http://localhost:4200 in google chrome. 

```sh
ng build
ng serve
```

 

##### Publish to Terminus Framework

These settings needs to be done before the application can be packaged as a web component and hosted on Terminus Framework. 

**1. Patient Identifier in appcomponent.ts**

​	Open appcomponent.ts and comment below lines.  When hosted on Terminus, the framework provides a personid to the module. 

```typescript
  encounterLoadComplete() {
// commment out below lines to push to framework
//this.appService.personId = "17775da9-8e71-4a3f-9042-4cdcbf97efec";
//this.initConfig(null);
 }
```

**2. Getting an auth. token from Terminus Framework - apirequest.service.ts**

***Uncomment*** the below lines in Services/apirequest.service.ts 

```json
 return from(this.appService.apiService.getRequest(uri));

 return from(this.appService.apiService.postRequest(uri, body));

 return from(this.appService.apiService.deleteRequest(uri));
```

***Comment*** the below lines in Services/apirequest.service.ts 

```json
//return from(this.authService.getToken().then((token) => { return this.callApiGet(token, uri); }));

//return from(this.authService.getToken().then((token) => { return this.callApiPost(token, uri, body); }));

//return from(this.authService.getToken().then((token) => { return this.callApiDelete(token, uri) }));

```

**3. Bootsrapping  a component in appmodule.ts**

The bootstrap array should be empty.

```json
  bootstrap: [],
```

**4. Package the app to host on Terminus**

In Visual Studio right click on the solution and open developer command prompt. Run the below commands.

```sh
npm run prod-build
```

 open the root folder of the solution and then open the dist folder. Find main.js which is the packaged application. 



#### Publish and Install

If you have not already created Interneuron sites in IIS, pls follow the below procedure to create the sites

1. Locate and copy the Interneuron-AppPools.xml and Interneuron-Sites.xml from Sample/IISSettings folder to a local folder. 

2. Open command prompt in administrator mode and execute the below commands

```
   %windir%\system32\inetsrv\appcmd add apppool /in < "path to Interneuron-AppPools.xml"
   
   %windir%\system32\inetsrv\appcmd add site /in < "path to  Interneuron-Sites.xml"
```

3. Please follow the instructions on the  Terminus - Framework Readme to deploy Terminus Framework. 
4. Package the application using the instructions in the above section **4. Package the app to host on Terminus**
5. Rename **main.js**  to ***observationchart.js*** and copy into the **observationchart** folder in **terminusmoduleloader** site folder in c:\inetpub\wwwroot. 



## Author

* GitHub: [Interneuron CIC](https://github.com/InterneuronCIC)



---

## 📝 License

Interneuron Terminus
Copyright(C) 2019  Interneuron CIC

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
The Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.

