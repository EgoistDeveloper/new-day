<?php

namespace App\Http\Requests\Day;

use Illuminate\Foundation\Http\FormRequest;

class DaybookRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'dummy_field' => 'required|string|max:250',
            // 'word_count' => 'required|numeric',
            // 'price' => 'required|numeric',
            // 'status' => 'required|in:listing,unlist',
            // 'file' => 'file|mimes:doc,docx,pdf,json,jpg,jpeg',
            // 'categories' => 'string|nullable'
        ];
    }
}
