function executeWidgetCode(){
    require(["DS/i3DXCompassServices/i3DXCompassServices","DS/WAFData/WAFData", "DS/DataDragAndDrop/DataDragAndDrop"],
    function(i3DXCompassServices, WAFData, DataDragAndDrop){
        var myWidget = {

            contentData : {},

            displayResult: function(data) {
                console.log(data);
                widget.getElement('#responseOutput').textContent = JSON.stringify(data, null, 2);
            },

            getServiceUrl: function(serviceNameToGet) {
                return new Promise((resolve,reject) => {
                    i3DXCompassServices.getServiceUrl(
                        {
                            serviceName: serviceNameToGet,
                            platformId: widget.getValue('x3dPlatformId'),
                            onComplete: (url) => resolve(url),
                            onFailure: (error) => reject(error),
                        }
                    )
                })
            },

            getCSRFToken: function() {
                return(new Promise((resolve,reject) => {
                    myWidget.getServiceUrl('3DSpace').then((serviceUrl) => {
                        const url = serviceUrl + "/resources/v1/application/CSRF"
                        WAFData.authenticatedRequest(url, {
                            method: "GET",
                            onComplete: (csrfRep) => resolve(JSON.parse(csrfRep).csrf.value),
                            onFailure:(error) => reject(error),
                        })
                    })
                }))
            },

            getListOfSecurityContext: function() {
                return(new Promise((resolve,reject) => {
                    myWidget.getServiceUrl('3DSpace').then((serviceUrl) => {
                        const url = serviceUrl + "/resources/modeler/pno/person?current=true&select=collabspaces";
                        const requestUrl = myWidget.addTenantIfMissing(url);
                        WAFData.authenticatedRequest(requestUrl, {
                            method: "GET",
                            type: "json",
                            onComplete: (securityContextResponse) => {
                                const listOfSecurityContext = myWidget.computeSecurityContextResponse(securityContextResponse);
                                resolve(listOfSecurityContext);
                            },
                            onFailure:(error) => reject(error),
                        })
                    })
                }))
            },

            computeSecurityContextResponse: function(securityContextResponse) {
                let listOfSecurityContext = [];
                if (securityContextResponse)
                {
                    const listOfCollabspaces = securityContextResponse.collabspaces;
                    listOfCollabspaces.map((collabspace) => {
                        const collabspaceName = collabspace.name;
                        const collabspaceCouples = collabspace.couples;
                        collabspaceCouples.map((couple) => {
                            const organizationName = couple.organization.name;
                            const roleName = couple.role.name;
                            listOfSecurityContext.push(roleName + "." + organizationName + "." + collabspaceName);
                        })
                    })
                }
                return (listOfSecurityContext);
            },

            addTenantIfMissing: function(url) {
                let urlObj = new URL(url);
                if(!urlObj.searchParams.has('tenant')) {
                    urlObj.searchParams.append('tenant', widget.getValue('x3dPlatformId'));
                }
                return urlObj.toString();
            },

            handleClickButton: function() {
                const method = widget.getElement('#method-select').value;
                let csrfPromise = Promise.resolve();
                if (method !== "GET")
                    csrfPromise = new Promise((resolve) => myWidget.getCSRFToken().then((CSRFTokenValue) => {
                        widget.setValue("CSRFToken", CSRFTokenValue);
                        resolve();
                    }));
                csrfPromise.then(()=>{
                    const csrfToken = widget.getValue("CSRFToken");
                    const url = widget.getElement('#url').value;
                    const requestUrl = myWidget.addTenantIfMissing(url);
                    const data = widget.getElement('#data').value;
                    WAFData.authenticatedRequest(requestUrl, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            securitycontext: widget.getPreference("securityContext").value,
                            "ENO_CSRF_TOKEN": csrfToken,
                        },
                        data: data,
                        type: "json",
                        onComplete: (dataOutput) => myWidget.displayResult(dataOutput),
                        onFailure: (error, errorOutput) => {
                            if (errorOutput)
                                myWidget.displayResult(errorOutput);
                            else
                            {
                                let errorResponse = { message: "Unknown error", details: error.message };
                                myWidget.displayResult(errorResponse);
                            } 
                        },
                    })})
            },

            handleClickCopyClipboardButton: function(){
                const responseText = widget.getElement('#responseOutput').textContent;
                navigator.clipboard.writeText(responseText).then(() => {
                    alert('Réponse copiée dans le presse-papier !');
                }).catch(err => {
                    console.error('Erreur lors de la copie :', err);
                });
            },

            handleClickOpenButton: function() {
                if (myWidget.contentData && Object.keys(myWidget.contentData).length > 0) {
                    i3DXCompassServices.getCompatibleApps({
                        content: myWidget.contentData,
                        onComplete: function(data) {
                            console.log(data);
                            for (let i=0; i<data.length; i++)
                                if (data[i].name === "X3DPLAW_AP")
                                {
                                    data[i].launchApp();
                                    break;
                                }
                        }
                    })
                }
            },

            handleClickClearButton: function() {
                myWidget.contentData = {};
                const dropElement = widget.getElement('.droppableElement');
                dropElement.innerHTML = "Glisser un fichier dans cette zone pour le charger";
                dropElement.style.border = "2px dashed";
            },

            onLoadWidget : function() {
                //Compute security context
                myWidget.getListOfSecurityContext().then((securityContextList) =>
                {
                    console.log(securityContextList);
                })

                widget.body.innerHTML = `
                <div class="section">
                    <h2>API REST test</h2>
                    <div class="RestRequestContainer">
                        <select id='method-select'>
                            <option value="GET"> GET </option>
                            <option value="POST"> POST </option>
                            <option value="PUT"> PUT </option>
                            <option value="PATCH"> PATCH </option>
                            <option value="DELETE"> DELETE </option>
                        </select>
                        <input type='text' id='url' placeholder="Entrer l'url">
                        <textarea id='data' placeholder='Entrer le body de la requête (JSON)'></textarea>
                        <button id='sendRequest'>Envoyer la requête</button>
                    </div>
                    <div class='response'>
                        <pre id='responseOutput' style="max-height: 300px; overflow: auto; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;"></pre>
                        <button id='copyResponse'>Copier la réponse dans le presse-papier</button>
                    </div>
                </div>
                
                <div class="section">
                    <h2>Drag & Drop</h2>
                    <div class='droppableElement' style="border: 2px dashed; padding: 10px;">Glisser un fichier dans cette zone pour le charger</div>
                    <button id='clearDrop'>Vider</button>
                    <button id='open3DPlay'>Ouvrir dans 3DPlay</button>
                </div>`;

                if (widget.getPreference("fillServiceUrl").value)
                {
                    const nodeInput = widget.getElement("#url");

                    if (widget.getPreference("serviceUrl").value !== "")
                    {
                        myWidget.getServiceUrl(widget.getPreference("serviceUrl").value).then((serviceUrl) => {
                            nodeInput.value = serviceUrl;
                        })
                    }
                }

                widget.getElement('#sendRequest').addEventListener('click', myWidget.handleClickButton);
                widget.getElement('#copyResponse').addEventListener('click', myWidget.handleClickCopyClipboardButton);
                widget.getElement('#clearDrop').addEventListener('click', myWidget.handleClickClearButton);
                widget.getElement('#open3DPlay').addEventListener('click', myWidget.handleClickOpenButton);
                
                const dropElement = widget.getElement('.droppableElement');
                const initialBorderStyle = dropElement.style.border;
                
                DataDragAndDrop.droppable(dropElement, {
                    enter: () => dropElement.style.border = '2px solid green',
                    leave: () => dropElement.style.border = initialBorderStyle,
                    over: () => console.log('Element is being dragged over the drop zone'),
                    drop: (droppedData) => {
                        if (!myWidget.contentData || Object.keys(myWidget.contentData).length === 0) {
                            const dataToSet = JSON.parse(droppedData);
                            if (dataToSet.data.items.length > 0) {
                                myWidget.contentData = dataToSet;
                                dropElement.innerHTML = JSON.stringify(dataToSet, null, 2);
                                dropElement.style.border = '2px solid green';
                            }
                        }
                    }
                });
            },
        };

        widget.addEvent("onLoad", myWidget.onLoadWidget);
        widget.addEvent("onRefresh", myWidget.onLoadWidget);
    })
}