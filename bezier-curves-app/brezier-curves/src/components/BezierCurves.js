import React, {userEffect, useRef, useEffect} from 'react';

function BezierCurves() {
  const canvasRef = useRef(null);

  useEffect(()=> {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    //Draw bezier curve
    ctx.beginPath();
    ctx.moveTo(50,100);
    ctx.bezierCurveTo(150,50,350,50,450,100);
    ctx.strokeStyle='blue';
    ctx.lineWidth = 2;
    ctx.stroke();

    //Control Points
    ctx.fillStyle='red';
    ctx.beginPath();
    ctx.arc(50,100,5,0,2*Math.PI);
    ctx.arc(150,50,5,0,2*Math.PI);
    ctx.arc(350,50,5,0,2*Math.PI);
    ctx.arc(450,100,5,0,2*Math.PI);
    ctx.fill();
    ctx.fillStyle='white';
  },[]);

  return (
      <div className="">
        <canvas ref={canvasRef} width={500} height={200}></canvas>
    </div>
  );
}

export default BezierCurves;
