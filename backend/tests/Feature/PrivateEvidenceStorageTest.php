<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Tests\TestCase;

class PrivateEvidenceStorageTest extends TestCase
{
    public function test_private_evidence_cannot_be_served_through_the_local_disk_even_with_a_local_signature(): void
    {
        $path = 'u2-storage-test/'.Str::uuid().'.txt';
        $private = Storage::disk('private');
        $this->assertFalse($private->exists($path));
        try {
            $private->put($path, 'Disposable storage isolation test.');
            $this->get('/storage/'.$path)->assertForbidden();
            $signed = URL::temporarySignedRoute('storage.local', now()->addMinute(), ['path' => $path], absolute: false);
            $this->get($signed)->assertNotFound();
            $this->assertFalse(Storage::disk('local')->exists($path));
            $this->assertFalse(Storage::disk('public')->exists($path));
            $this->assertFalse(Route::has('storage.private'));
        } finally {
            $private->delete($path);
        }
        $this->assertFalse($private->exists($path));
    }
}
