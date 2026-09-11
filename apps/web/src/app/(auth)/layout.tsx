export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xl leading-none">P</span>
            </div>
            <span className="text-2xl font-bold text-text">Pulse</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
