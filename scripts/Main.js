function executeWidgetCode(){
    require(["DS/i3DXCompassServices/i3DXCompassServices", "DS/i3DXCompassServices/i3DXCompassPubSub","DS/DataDragAndDrop/DataDragAndDrop"],function(i3DXCompassServices, i3DXCompassPubSub, DataDragAndDrop){
        var myWidget = {

            contentData : {},

            handleClickButton: function() {
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
                widget.body.innerHTML = "";
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
                                    click: myWidget.handleClickButton,
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