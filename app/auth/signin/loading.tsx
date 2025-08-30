export default function SignInLoading() {
  return (
    <div className='flex items-center justify-center min-h-[60vh]'>
      <div className='w-full max-w-md space-y-6'>
        <div className='animate-pulse'>
          <div className='h-8 bg-gray-700 rounded w-32 mx-auto mb-2'></div>
          <div className='h-4 bg-gray-700 rounded w-48 mx-auto'></div>
        </div>

        <div className='space-y-4'>
          <div>
            <div className='h-4 bg-gray-700 rounded w-20 mb-2'></div>
            <div className='h-10 bg-gray-700 rounded'></div>
          </div>

          <div className='h-10 bg-gray-700 rounded'></div>
        </div>
      </div>
    </div>
  );
}
