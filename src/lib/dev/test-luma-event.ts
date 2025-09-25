#!/usr/bin/env node

/**
 * Debug script to test Luma API event creation and verify description field
 */

import type { CreateEventFormData } from '@/src/lib/schemas/events.schema';
import { lumaService } from '@/src/services/luma';

async function testLumaAPI() {
  console.log('🔍 Testing Luma API event creation with description...\n');

  // Create a mock File object for testing
  const mockFile = new File(['test'], 'test-logo.png', { type: 'image/png' });

  // Test with sample form data
  const sampleFormData: CreateEventFormData = {
    title: 'DEBUG: Test Event with Description',
    description:
      'This is a test event description that should appear in the Luma event. It contains multiple lines and formatting to test if the description field is properly set.',
    startDate: new Date('2024-12-01T10:00:00Z'),
    endDate: new Date('2024-12-01T12:00:00Z'),
    commune: 'Las Condes, Santiago',
    capacity: 50,
    format: 'networking',
    authorName: 'Test Author',
    authorEmail: 'test@example.com',
    authorPhoneNumber: '+56912345678',
    companyName: 'Test Company',
    companyWebsite: 'https://example.com',
    companyLogoUrl: '',
    logoFile: mockFile,
    themeIds: [],
    audienceIds: [],
    lumaLink: '',
    cohosts: [],
  };

  try {
    console.log('📝 Sample event data:');
    console.log(`Title: ${sampleFormData.title}`);
    console.log(`Description: ${sampleFormData.description}`);
    console.log(`Start: ${sampleFormData.startDate.toISOString()}`);
    console.log(`End: ${sampleFormData.endDate.toISOString()}`);
    console.log(`Location: ${sampleFormData.commune}`);
    console.log(`Capacity: ${sampleFormData.capacity}\n`);

    // Test 1: Using LumaService (this is the main test)
    console.log('🚀 Test 1: Creating event via LumaService (FIXED)...');
    const serviceResult = await lumaService.createEventFromFormData(
      sampleFormData,
      'debug-event-123',
    );

    if (serviceResult.success) {
      console.log('✅ LumaService event creation successful!');
      console.log(`Event URL: ${serviceResult.eventUrl}`);
      console.log(`Event API ID: ${serviceResult.eventApiId}`);
      console.log(
        `Co-host result: ${serviceResult.cohostResult?.success ? 'Success' : 'Failed'}\n`,
      );

      console.log('📝 Generated description that was sent to Luma:');
      console.log('---');
      const generatedDescription = lumaService.generateEventDescription(
        sampleFormData,
        'debug-event-123',
      );
      console.log(generatedDescription);
      console.log('---\n');

      console.log('🎉 CONCLUSION:');
      console.log(
        '✅ Event created successfully with API ID:',
        serviceResult.eventApiId,
      );
      console.log('✅ Event URL generated:', serviceResult.eventUrl);
      console.log(
        '✅ Description field (description_md) is being sent in the request (see above)',
      );
      console.log(
        '✅ The Luma API accepts the description_md field without errors',
      );
      console.log(
        '✅ You can now visit the event URL to manually verify the description appears\n',
      );

      // Manual verification instructions
      console.log('🔍 Manual Verification:');
      console.log(`1. Visit: ${serviceResult.eventUrl}`);
      console.log('2. Check if the description appears on the event page');
      console.log(
        '3. The description should contain the checklist and organizational info\n',
      );
    } else {
      console.log('❌ LumaService event creation failed:');
      console.log(`Error: ${serviceResult.error}\n`);
    }
  } catch (error) {
    console.error('💥 Error during Luma API test:', error);
  }
}

// Run the test
testLumaAPI().catch(console.error);
