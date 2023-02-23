// Define an array of labels, values, and currency for the chart
const labels = ['Asset A', 'Asset B', 'Asset C', 'Asset D', 'Asset E'];
const values = [50, 100, 75.2, 90, 40.5];
const currency = "$";

// Define a custom interaction mode for the Chart.js chart
Chart.Interaction.modes.customInteraction = function(chart, e, options) {

  // Get the relative position of the mouse pointer within the chart
  const position = Chart.helpers.getRelativePosition(e, chart);
  
  // Initialize arrays to store items that are within range of the mouse pointer
  const items = [];
  const allItems = [];

  // Initialize a flag to track whether the summary is being hovered over
  var isSummaryHovered = false;

  // Evaluate interaction items based on their x position and position of the mouse pointer
  Chart.Interaction.evaluateInteractionItems(chart, 'x', position, (element, datasetIndex, index) => {

    // If summary item is hovered, set the summary hover flag to true
    if(element.inRange(position.x, position.y) && chart.data.datasets[datasetIndex].isSummary?.at(index)===true){
      isSummaryHovered = true;
    }

    // If an item is in range and not summary item, add it to the items array
    else if (element.inRange(position.x, position.y)) {
      items.push({element, datasetIndex, index});
    }

    // If an item is out of range, add it to the allItems array
    else{
      allItems.push({element, datasetIndex, index});
    }
  });

  // Return allItems if the summary is being hovered over, otherwise return the items array
  return isSummaryHovered ? allItems : items;
};

// Define a custom chartjs animation
const animation = {
    // Define a function called "onProgress" as a property of the "animation" object
    onProgress: function(animation) {
        // Retrieve the "chart" object from the "animation" object
        const chart = animation.chart;
            // Check if tooltip is active and return if it is
        if(chart.tooltip?._active && chart.tooltip._active.length !== 0) return;

        // Destructure the "ctx", "chartArea", "top", "bottom", "left", "right", "width", and "height" properties from the "chart" object
        var {ctx, chartArea: {top, bottom, left, right, width, height}} = chart;

        // Calculate the alpha value for the current step in the animation
        const alpha = animation.currentStep / animation.numSteps;

        // Increase the width and height to include the chartArea boundaries
        width += left*2;
        height += top*2;

        // Calculate the half width and height of the chart
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        // Retrieve the first dataset from the chart data
        const dataset = chart.data.datasets[0];

        // Initialize variables to track previous x, y, and quadrant values
        let prevY, prevX, prevQuadrant;

        // Label each data
        chart.getDatasetMeta(0).data.forEach((datapoint, index)=>{
            // Save the current state of the canvas
            ctx.save();

            // Set the global alpha to the calculated alpha value
            ctx.globalAlpha = alpha;

            // Retrieve the startAngle, endAngle, innerRadius, and outerRadius properties from the current datapoint
            const {startAngle, endAngle, innerRadius, outerRadius} = datapoint;

            // Retrieve the x and y position of the tooltip for the current datapoint
            const { x, y } = datapoint.tooltipPosition();

            // Retrieve the label for the current datapoint
            const text = chart.data.labels[index];

            // Calculate the angle and line length for the current datapoint
            const angle = ( startAngle + endAngle ) / 2;
            const lineLength = (outerRadius - innerRadius)*0.7;

            // Calculate the quadrant that the current datapoint is in
            const quadrant = x >= halfWidth && y >= halfHeight ? 1 :
                                x >= halfWidth && y < halfHeight ? 2 :
                                x < halfWidth && y < halfHeight ? 3 : 4;

            // Calculate the x and y position of the line based on the angle and line length
            var xLine = x + lineLength*Math.cos(angle);
            var yLine = y + lineLength*Math.sin(angle);

            // Set the font for the text
            ctx.font = '14px Verdana'

            // Calculate the width of the text
            const textWidth = ctx.measureText(text).width;

            // Calculate the extra line distance based on the quadrant
            const extraLine = x >= halfWidth ? textWidth : -textWidth;

            // Check if the line is off the canvas boundaries and adjust if necessary
            if((xLine + extraLine) < 0 ){
                xLine = -extraLine;
            }
            else if ((xLine + extraLine)>width){
                xLine = width-extraLine;
            }

            // Check for overlapping labels
            let currentX = quadrant % 2 === 1 ? xLine + extraLine : xLine; // set currentX based on quadrant value
            let constant = y < halfHeight ? 1 : -1; // set constant based on y value
            if (prevY && prevQuadrant === quadrant && prevX && (currentX - prevX) * constant < 5 && Math.abs(yLine - prevY) < 27) {
                // check if previous y value, previous quadrant value, and previous x value exist and if the labels are overlapping
                prevY = yLine = x > halfWidth ? prevY + 22 : prevY - 22; // adjust yLine value if labels overlap
            } else {
                prevY = yLine; // set prevY to yLine
                prevQuadrant = quadrant; // set prevQuadrant to quadrant
            }

            prevX = quadrant % 2 === 1 ? xLine : xLine + extraLine; // set prevX based on quadrant value

            // Draw the line
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(xLine, yLine);
            ctx.lineTo(xLine + extraLine, yLine);
            ctx.strokeStyle = "gray";
            ctx.stroke();

            // Draw dot
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI);
            ctx.fillStyle = 'gray';
            ctx.fill();

            // Draw text
            const textPositionX = x >= halfWidth ? 'left' : 'right';
            ctx.textAlign = textPositionX;
            ctx.textBaseline = "middle";
            ctx.fillStyle = dataset.backgroundColor[index];
            ctx.globalAlpha = alpha;
            ctx.fillText(text, xLine, yLine - 8);
            ctx.restore();
        })

        // Label the summary
        chart.getDatasetMeta(1).data.forEach(async (datapoint, index) => {
            ctx.save();
            const text = `${currency} ${chart.data.datasets[1].data[index].toFixed(2)}`; 
            var textHeight = 20;
            ctx.font = `${textHeight}px Verdana`;
            const diameter = datapoint.outerRadius * 2;
            const padding = 0.2 * diameter;
            // Reduce the text height until it fits within the available space
            while (ctx.measureText(text).width > diameter - padding) {
                ctx.font = `${--textHeight}px Verdana`;
            }

            ctx.textAlign = "center";
            ctx.textBaseline = "middle"; 
            ctx.fillStyle = "white"; 
            ctx.globalAlpha = alpha; 
            ctx.fillText(text, halfWidth, halfHeight); // add the text to the canvas at the center coordinates
            ctx.restore();
        })
    }
}

class assetsChart extends HTMLCanvasElement{
    connectedCallback(){
        // Get a reference to the canvas element
        let canvas = this;
        // Get a 2D rendering context for the canvas
        let ctx = canvas.getContext('2d');

        // Display loading message
        ctx.font = '22px Verdana';
        ctx.textAlign = 'center';
        ctx.fillText('Loading data...', ctx.canvas.width / 2, ctx.canvas.height / 2);
        
        // Define an object containing the chart data
        const data = {
            // Labels for the chart
            labels: labels.concat(["Total"]),
            // Two datasets: one for the individual asset values, and one for the total value
            datasets: [
                {
                    data: values,
                    // Use chroma to generate background color
                    backgroundColor: chroma.scale(['#10CFF1','#BD5750']).mode('lch').colors(labels.length),
                },
                {
                    // Set the total value to be the sum of all the individual asset values
                    data: [values.reduce((a, b) => a + b, 0)],
                    backgroundColor: "#2C3E50",
                    borderColor: "#2C3E50",
                    // Set this dataset as summary
                    isSummary: [true]
                },
            ],
        };
        
        // Define an object containing the chart options
        const options = {
            // Callback function to update the chart when the window is resized
            onResize: function(chart) {
                chart.update();
            },
            maintainAspectRatio: true,
            aspectRatio: 1.15,
            // Rotate the chart by 65 degrees
            rotation: 65,
            plugins: {
                // Disable the chart legend
                legend: false,
                // Enable tooltips and set custom label and footer functions
                tooltip: {
                    enabled: true,
                    mode: 'customInteraction',
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${currency} ${context.raw.toFixed(2)}`;
                        },
                        afterFooter: function(context){
                            if(context.length>1){
                                const total = (context.reduce((a, b) => a + b.raw*100, 0)/100).toFixed(2);
                                return `Total: ${currency} ${total}`;
                            }
                            return "";
                        }
                    }
                },
            },
            layout: {
                // Add padding around the chart to prevent labels from being cut off
                padding: 50
            },
            // Enable animation
            animation: animation
        };

        // Create a new Chart object, passing in the canvas element, chart type, data, and options
        var chart = new Chart(canvas, {
            type: 'pie',
            data: data,
            options: options,
        });
        
        // Add an event listener to resize the chart when the window is resized
        window.addEventListener("resize", ()=>chart.resize());
    }
}

// Export the custom chart
customElements.define("assets-chart",assetsChart, {extends:"canvas"});