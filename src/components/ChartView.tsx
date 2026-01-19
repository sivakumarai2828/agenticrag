import { useEffect, useRef } from 'react';
import { ChartConfig } from '../services/mockChart';
import { Download } from 'lucide-react';

interface ChartViewProps {
  config: ChartConfig;
}

export default function ChartView({ config }: ChartViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawChart(canvasRef.current, config);
  }, [config]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        link.download = `velyx-data-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Data Visualization</h4>
        <button
          onClick={handleDownload}
          className="flex items-center space-x-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-[#F59E8B] hover:bg-white rounded-lg transition-all border border-slate-200/60"
        >
          <Download size={12} />
          <span>Export (PNG)</span>
        </button>
      </div>
      <div className="bg-white/60 backdrop-blur-xl border border-white shadow-inner rounded-2xl p-6">
        <canvas ref={canvasRef} id="chart-canvas" width="600" height="300" className="w-full h-auto"></canvas>
      </div>
    </div>
  );
}

function drawChart(canvas: HTMLCanvasElement, config: ChartConfig): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { data } = config;
  const padding = 60;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (config.type === 'pie') {
    drawPieChart(ctx, canvas, data, padding);
    return;
  }

  const allValues = data.datasets.flatMap(d => d.data);
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 0;
  const minValue = 0;
  const range = maxValue === 0 ? 10 : maxValue - minValue;

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px sans-serif';

  const maxLabels = 8;
  const labelStep = data.labels.length > 0 ? Math.ceil(data.labels.length / maxLabels) : 1;
  data.labels.forEach((label, i) => {
    if (i % labelStep === 0 || i === data.labels.length - 1) {
      const x = padding + (i * width) / Math.max(1, data.labels.length - 1);
      ctx.save();
      ctx.translate(x, canvas.height - 25);
      ctx.rotate(-Math.PI / 8);
      ctx.textAlign = 'right';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  });

  [0, 0.25, 0.5, 0.75, 1].forEach(factor => {
    const value = Math.round(minValue + range * factor);
    const y = padding + height * (1 - factor);
    ctx.fillText(value.toLocaleString(), 15, y + 4);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  });

  data.datasets.forEach((dataset, datasetIndex) => {
    const offsetX = datasetIndex * 20 - 10;

    if (config.type === 'bar') {
      const barWidth = width / Math.max(1, data.labels.length) / data.datasets.length - 8;
      dataset.data.forEach((value, i) => {
        const x =
          padding + (i * width) / Math.max(1, data.labels.length) + offsetX + datasetIndex * barWidth;
        const barHeight = ((value - minValue) / range) * height;
        const y = padding + height - barHeight;

        ctx.fillStyle = dataset.color;

        // Rounded bar effect
        const radius = 4;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
        ctx.fill();

        // Subtle glow
        ctx.shadowColor = dataset.color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
    } else if (config.type === 'line') {
      ctx.strokeStyle = dataset.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Shadow for line
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;

      ctx.beginPath();
      dataset.data.forEach((value, i) => {
        const x = padding + (i * width) / Math.max(1, data.labels.length - 1);
        const y = padding + height - ((value - minValue) / range) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      dataset.data.forEach((value, i) => {
        const x = padding + (i * width) / Math.max(1, data.labels.length - 1);
        const y = padding + height - ((value - minValue) / range) * height;

        ctx.fillStyle = dataset.color;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    ctx.fillStyle = dataset.color;
    ctx.beginPath();
    ctx.arc(padding + datasetIndex * 180 + 6, 15, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(dataset.label.toUpperCase(), padding + datasetIndex * 180 + 20, 19);
  });
}

function drawPieChart(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: ChartConfig['data'],
  padding: number
): void {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 - 10;
  const radius = Math.min(canvas.width, canvas.height) / 2 - padding - 20;

  const dataset = data.datasets[0];
  const total = dataset.data.reduce((sum, val) => sum + val, 0);

  const colors = [
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#ef4444',
    '#06b6d4',
    '#84cc16',
  ];

  let startAngle = -Math.PI / 2;

  dataset.data.forEach((value, i) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    const labelAngle = startAngle + sliceAngle / 2;
    const labelRadius = radius * 0.7;
    const labelX = centerX + Math.cos(labelAngle) * labelRadius;
    const labelY = centerY + Math.sin(labelAngle) * labelRadius;

    const percentage = ((value / total) * 100).toFixed(1);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percentage}%`, labelX, labelY);

    startAngle = endAngle;
  });

  const legendY = canvas.height - 40;
  const legendItemWidth = 120;
  const startX = (canvas.width - legendItemWidth * Math.min(data.labels.length, 4)) / 2;

  data.labels.forEach((label, i) => {
    const x = startX + (i % 4) * legendItemWidth;
    const y = legendY + Math.floor(i / 4) * 20;

    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y, 12, 12);

    ctx.fillStyle = '#1f2937';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 18, y + 10);
  });
}
