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
        a.download = `chart-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Visualization</h4>
        <button
          onClick={handleDownload}
          className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
        >
          <Download size={14} />
          <span>PNG</span>
        </button>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <canvas ref={canvasRef} id="chart-canvas" width="600" height="300"></canvas>
      </div>
    </div>
  );
}

function drawChart(canvas: HTMLCanvasElement, config: ChartConfig): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { data } = config;
  const padding = 50;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const allValues = data.datasets.flatMap(d => d.data);
  const maxValue = Math.max(...allValues);
  const minValue = 0;
  const range = maxValue - minValue;

  ctx.fillStyle = '#1f2937';
  ctx.font = '12px sans-serif';

  data.labels.forEach((label, i) => {
    const x = padding + (i * width) / (data.labels.length - 1);
    ctx.fillText(label, x - 15, canvas.height - 20);
  });

  [0, 0.25, 0.5, 0.75, 1].forEach(factor => {
    const value = Math.round(minValue + range * factor);
    const y = padding + height * (1 - factor);
    ctx.fillText(value.toLocaleString(), 10, y + 4);

    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  });

  data.datasets.forEach((dataset, datasetIndex) => {
    const offsetX = datasetIndex * 20 - 10;

    if (config.type === 'bar') {
      const barWidth = width / data.labels.length / data.datasets.length - 8;
      dataset.data.forEach((value, i) => {
        const x =
          padding + (i * width) / data.labels.length + offsetX + datasetIndex * barWidth;
        const barHeight = ((value - minValue) / range) * height;
        const y = padding + height - barHeight;

        ctx.fillStyle = dataset.color;
        ctx.fillRect(x, y, barWidth, barHeight);
      });
    } else {
      ctx.strokeStyle = dataset.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      dataset.data.forEach((value, i) => {
        const x = padding + (i * width) / (data.labels.length - 1);
        const y = padding + height - ((value - minValue) / range) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        ctx.fillStyle = dataset.color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = dataset.color;
      ctx.stroke();
    }

    ctx.fillStyle = dataset.color;
    ctx.fillRect(padding + datasetIndex * 120, 10, 12, 12);
    ctx.fillStyle = '#1f2937';
    ctx.font = '11px sans-serif';
    ctx.fillText(dataset.label, padding + datasetIndex * 120 + 18, 20);
  });
}
