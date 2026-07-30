import AlbumIntakeForm from '../components/intake/AlbumIntakeForm';

// Auth is now handled at the route level by AuthGuard in App.tsx.
// This page simply renders the intake form for authenticated users.
export default function IntakePage() {
  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-12 relative overflow-hidden">
      {/* Background blobs matching the theme */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto relative z-10 flex flex-col items-center">
        <AlbumIntakeForm />
      </div>
    </div>
  );
}
