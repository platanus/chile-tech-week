import type { CreateEventFormData } from '@/src/lib/schemas/events.schema';
import { lumaService } from '@/src/services/luma';

async function testLumaService() {
  console.log('Testing Luma Service API...\n');

  // Test connection first
  console.log('1. Testing connection...');
  const isConnected = await lumaService.testConnection();
  console.log(`Connection test: ${isConnected ? '✅ Success' : '❌ Failed'}\n`);

  if (!isConnected) {
    console.log('Please check your LUMA_API_KEY environment variable');
    return;
  }

  // Create sample event data
  const sampleEventData: CreateEventFormData = {
    // Author information
    authorEmail: 'test@platanus.tech',
    authorName: 'Rafael Dos Santos',
    companyName: 'Platanus',
    companyWebsite: 'https://platanus.tech',
    authorPhoneNumber: '+56912345678',

    // Event details
    title: 'Test Tech Event - AI & Innovation Workshop',
    description:
      'Join us for an exciting workshop on AI innovation and emerging technologies. Perfect for developers, entrepreneurs, and tech enthusiasts.',
    startDate: new Date('2025-11-18T14:00:00-03:00'), // Chile timezone
    endDate: new Date('2025-11-18T17:00:00-03:00'), // 3 hours later

    // Location
    commune: 'Las Condes, Santiago',

    // Event properties
    format: 'roundtable_workshop' as const,
    capacity: 50,
    lumaLink: 'https://lu.ma/existing-event-link', // Optional existing link
    companyLogoUrl: 'https://platanus.tech/logo.png',

    // Mock logo file (required in schema but not used in service)
    logoFile: new File([''], 'logo.png', { type: 'image/png' }),

    // Co-hosts
    cohosts: [
      {
        companyName: 'NotCo',
        primaryContactName: 'Matias Muchnick',
        primaryContactEmail: 'matias@example.com',
        primaryContactPhoneNumber: '+56987654321',
        primaryContactWebsite: 'https://notco.com',
        primaryContactLinkedin: 'https://linkedin.com/in/matiasmuchnick',
      },
      {
        companyName: 'Cornershop',
        primaryContactName: 'Oskar Hjertonsson',
        primaryContactEmail: 'oskar@example.com',
        primaryContactPhoneNumber: '+56912345679',
        primaryContactWebsite: 'https://cornershop.io',
        primaryContactLinkedin: '',
      },
    ],

    // Mock theme IDs (required in schema)
    themeIds: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
  };

  console.log('2. Creating test event...');
  console.log('Sample event data:');
  console.log({
    title: sampleEventData.title,
    startDate: sampleEventData.startDate.toISOString(),
    endDate: sampleEventData.endDate.toISOString(),
    organizer: `${sampleEventData.authorName} (${sampleEventData.authorEmail})`,
    cohosts: sampleEventData.cohosts?.map(
      (h) => `${h.companyName} - ${h.primaryContactName}`,
    ),
    location: sampleEventData.commune,
    format: sampleEventData.format,
    capacity: sampleEventData.capacity,
  });
  console.log('\n');

  const result = await lumaService.createEventFromFormData(sampleEventData);

  console.log('3. Results:');
  console.log('Success:', result.success ? '✅' : '❌');

  if (result.success) {
    console.log('Event URL:', result.eventUrl);
    console.log('Event API ID:', result.eventApiId);

    if (result.cohostResult) {
      console.log('\nCo-host addition results:');
      console.log(`- Successful: ${result.cohostResult.successful_count}`);
      console.log(`- Failed: ${result.cohostResult.failed_count}`);

      result.cohostResult.results.forEach((hostResult, index) => {
        const status = hostResult.success ? '✅' : '❌';
        console.log(`  ${index + 1}. ${hostResult.email}: ${status}`);
        if (hostResult.error) {
          console.log(`     Error: ${hostResult.error}`);
        }
      });
    }
  } else {
    console.log('Error:', result.error);
  }

  console.log('\n4. Test completed!');
}

console.log(process.env);
// Handle environment check
if (!process.env.LUMA_API_KEY) {
  console.error('❌ LUMA_API_KEY environment variable is not set');
  console.log('Please add LUMA_API_KEY to your .env.local file');
  process.exit(1);
}

// Run the test
testLumaService().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
