import { Star } from 'lucide-react';

interface RatingInputProps {
  value: string;
  onChange: (val: string) => void;
}

export default function RatingInput({ value, onChange }: RatingInputProps) {
  const numericVal = parseFloat(value);
  const isValid = !isNaN(numericVal) && numericVal >= 0 && numericVal <= 10;
  
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-white/70 mb-2">Rating (0.0 - 10.0)</label>
      <div className="flex items-center gap-4">
        <input
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.0"
          className="w-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-purple text-white text-center font-mono font-bold"
        />
        <div className="flex items-center gap-2">
          <Star className={`w-6 h-6 ${isValid && numericVal >= 8 ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
          {value && isValid && (
            <span className="text-xl font-bold tracking-tight text-white/90">
              / 10
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
