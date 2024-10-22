function executeWidgetCode(){
    require(["DS/i3DXCompassServices/i3DXCompassServices","DS/WAFData/WAFData"],function(i3DXCompassServices, WAFData){
        var myWidget = {

            displayResult: function(data) {
                console.log(data);
                widget.getElement('#responseOutput').textContent = JSON.stringify(data);
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
                    const data = widget.getElement('#data').value;
                    WAFData.authenticatedRequest(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            securitycontext: widget.getPreference("securityContext").value,
                            "ENO_CSRF_TOKEN": csrfToken,
                        },
                        data: {...data,
                            tenant: widget.getValue('x3dPlatformId'),
                        },
                        onComplete: (dataOutput) => myWidget.displayResult(JSON.parse(dataOutput)),
                        onFailure: (error) => myWidget.displayResult(error),
                    })})
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
                <div class = 'response'>
                <pre id='responseOutput'></pre>
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
                
                const nodeSend = widget.createElement('button', {
                    events: {
                        click : myWidget.handleClickButton,
                    },
                    text: 'Envoyer la requête'
                })

                widget.getElement('.RestRequestContainer').appendChild(nodeSend);
            },

        }
        widget.addEvent("onLoad", myWidget.onLoadWidget);
        widget.addEvent("onRefresh", myWidget.onLoadWidget);
    })
}