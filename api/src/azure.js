'use strict';
const {app}=require('@azure/functions');
const {createContactHandler}=require('./contact');
app.http('contact',{route:'contact',authLevel:'anonymous',methods:['GET','POST','HEAD','PUT','DELETE','OPTIONS'],handler:createContactHandler()});
