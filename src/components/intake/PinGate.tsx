import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface PinGateProps {
  onSuccess: () => void;
}

export default function PinGate({ onSuccess }: PinGateProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError(false);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    } else if (value && index === 3) {
      // Check PIN
      const enteredPin = newPin.join('');
      if (enteredPin === import.meta.env.VITE_INTAKE_PIN) {
        onSuccess();
      } else {
        setError(true);
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-3xl neon-border max-w-sm w-full text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-neon-purple/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-neon-purple" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Restricted Access</h2>
        <p className="text-white/50 mb-8 text-sm">Enter PIN to access the intake form.</p>

        <div className="flex justify-center gap-3 mb-6">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-14 h-16 text-center text-2xl font-bold bg-white/5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-purple transition-colors ${
                error ? 'border-red-500' : 'border-white/10'
              }`}
            />
          ))}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 text-sm font-medium"
          >
            Incorrect PIN. Try again.
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
