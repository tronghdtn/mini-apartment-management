<?php

namespace Tests\Feature;

use Tests\TestCase;

class UploadRequestSizeTest extends TestCase
{
    public function test_oversized_api_request_has_a_vietnamese_json_error_before_processing(): void
    {
        $this->call('POST', '/api/v1/maintenance-requests', server: [
            'CONTENT_LENGTH' => 33 * 1024 * 1024,
            'HTTP_ACCEPT' => 'application/json',
        ])->assertStatus(413)->assertJsonPath('message',
            'Yêu cầu tải lên quá lớn. Vui lòng gửi tối đa 20 ảnh, tổng 30 MB mỗi lần.');
    }
}
