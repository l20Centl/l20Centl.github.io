function executeWidgetCode(){
    require(["DS/i3DXCompassServices/i3DXCompassServices","DS/WAFData/WAFData"],function(i3DXCompassServices, WAFData){
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
                        onComplete: (dataOutput) => myWidget.displayResult(JSON.parse(dataOutput)),
                        onFailure: (error) => myWidget.displayResult(error),
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
            },

            onLoadWidget : function() {
                widget.body.innerHTML = `<div class="RestRequestContainer">
                <select name='method' id='method-select'>
                    <option value="GET"> GET </option>
                    <option value="POST"> POST </option>
                    <option value="PUT"> PUT </option>
                    <option value="PATCH"> PATCH </option>
                    <option value="DELETE"> DELETE </option>
                </select>
                <input type='text' id='url' placeholder="Entrer l'url">
                <textarea id='data' placeholder='Entrer le body de la requête (JSON)'></textarea>
                </div>
                <div class='response'>
                    <pre id='responseOutput' style="max-height: 300px; overflow: auto; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;"></pre>
                </div>`;

                if (widget.getPreference("fillServiceUrl").value)
                {
                    const nodeInput = widget.getElement("#url");

                    if (widget.getPreference("serviceUrl").value !== "")
                    {
                        myWidget.getServiceUrl(widget.getPreference("serviceUrl").value).then((serviceUrl) => {
                            nodeInput.value = serviceUrl;
                        });
                    };
                };
                
                const nodeSend = widget.createElement('button', {
                    events: {
                        click : myWidget.handleClickButton,
                    },
                    text: 'Envoyer la requête'
                });

                widget.getElement('.RestRequestContainer').appendChild(nodeSend);

                // Ajouter un événement pour copier la réponse dans le presse-papier
                const nodeCopyClipboard = widget.createElement('button', {
                    events: {
                        click : myWidget.handleClickCopyClipboardButton,
                    },
                    text: "Copier la réponse dans le presse-papier"
                });

                widget.getElement('.response').appendChild(nodeCopyClipboard);

                //Ajoute du drag & drop pour les tests d'ouverture de widget 3DX.
                const dropElement = widget.createElement('div', {
                    'class': 'droppableElement',
                    html: "Drag file to this area to upload",
                    styles: {
                        border: "2px dashed",
                        width : "auto",
                        height : "auto",
                        padding : "2px",
                    },
                });
                widget.body.appendChild(dropElement);

                const initialBorderStyle = dropElement.style.border;

                DataDragAndDrop.droppable(dropElement, {
                    enter: () => dropElement.style.border = '2px solid green',
                    leave: () => dropElement.style.border = initialBorderStyle,
                    over: () => console.log('Element is being dragged over the drop zone'),
                    drop: (droppedData) => {
                        const dataToSet = JSON.parse(droppedData);
                        if (Object.keys(dataToSet).length > 0 && dataToSet.data.items.length > 0)
                        {
                            myWidget.contentData = dataToSet;
                            const dataElement = widget.createElement('p', {
                                'class': 'dataElement',
                                html: myWidget.contentData.data.items[0].displayName,
                                events: {
                                    click: myWidget.handleClickOpenButton,
                                },
                            },);
                            widget.body.removeChild(dropElement);
                            widget.body.appendChild(dataElement);
                        }
                    }
                })
            },

        }
        widget.addEvent("onLoad", myWidget.onLoadWidget);
        widget.addEvent("onRefresh", myWidget.onLoadWidget);
    })
}