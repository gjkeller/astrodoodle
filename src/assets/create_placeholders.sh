#!/bin/bash
# Create simple colored PNG placeholders using ImageMagick or other tools
# Since we don't have those, we'll create a simple HTML canvas-based tool

cat > temp.html << 'HTML'
<!DOCTYPE html>
<html>
<body>
<canvas id="c" width="256" height="256"></canvas>
<script>
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#333333';
ctx.fillRect(0, 0, 256, 256);
ctx.fillStyle = '#ffffff';
ctx.font = '20px Arial';
ctx.textAlign = 'center';
ctx.fillText('Placeholder', 128, 128);
console.log(canvas.toDataURL());
</script>
</body>
</html>
HTML
