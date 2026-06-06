interface BalanceIndicatorProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
}

const BalanceIndicator = ({ amount, size = 'md' }: BalanceIndicatorProps) => {
  const isDue = amount > 0;
  const textSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };

  return (
    <span className={`font-semibold ${textSizes[size]} ${isDue ? 'balance-due' : 'balance-advance'}`}>
      ৳{Math.abs(amount).toFixed(0)}
      <span className="text-xs font-normal ml-1">
        {isDue ? 'Due' : 'Advance'}
      </span>
    </span>
  );
};

export default BalanceIndicator;
