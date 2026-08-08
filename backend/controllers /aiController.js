import Groq from 'groq-sdk';
import doctorModel from '../models/doctorModel.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const DEFAULT_SPECIALITIES = ['General physician', 'Gynecologist', 'Dermatologist', 'Pediatricians', 'Neurologist', 'Gastroenterologist'];

//Api to recommend a doctor speciality based on described symptoms
const recommendDoctor = async (req, res) => {
    try {
        const { symptoms } = req.body;

        if (!symptoms || !symptoms.trim()) {
            return res.json({ success: false, message: "Please describe your symptoms" });
        }

        if (!process.env.GROQ_API_KEY) {
            return res.json({ success: false, message: "AI recommendation is not configured" });
        }

        let specialities = await doctorModel.distinct('speciality');
        if (!specialities.length) {
            specialities = DEFAULT_SPECIALITIES;
        }

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: "You are a medical triage assistant for a doctor-appointment booking app. You are not a doctor and you do not provide a diagnosis. Given a patient's described symptoms, pick exactly one speciality from the provided list that they should book an appointment with, and give a brief, patient-friendly reason. If the symptoms described sound like a medical emergency (for example chest pain, difficulty breathing, stroke symptoms, severe bleeding, or suicidal thoughts), set urgent to true and write a short message telling the patient to seek immediate or emergency care instead of booking online."
                },
                {
                    role: 'user',
                    content: `Available specialities: ${specialities.join(', ')}\n\nPatient's symptoms: ${symptoms}`
                }
            ],
            tools: [{
                type: 'function',
                function: {
                    name: 'recommend_speciality',
                    description: 'Record the recommended doctor speciality for the patient',
                    parameters: {
                        type: 'object',
                        properties: {
                            speciality: { type: 'string', enum: specialities, description: 'The recommended speciality, must be exactly one of the provided options' },
                            reason: { type: 'string', description: 'A brief, patient-friendly explanation for the recommendation' },
                            urgent: { type: 'boolean', description: 'True if the symptoms suggest a medical emergency requiring immediate care' },
                            urgentMessage: { type: 'string', description: 'If urgent is true, a short message telling the patient to seek immediate care' }
                        },
                        required: ['speciality', 'reason', 'urgent']
                    }
                }
            }],
            tool_choice: { type: 'function', function: { name: 'recommend_speciality' } }
        });

        const toolCall = completion.choices[0]?.message?.tool_calls?.[0];

        if (!toolCall) {
            return res.json({ success: false, message: "Could not generate a recommendation" });
        }

        const { speciality, reason, urgent, urgentMessage } = JSON.parse(toolCall.function.arguments);

        const doctors = await doctorModel.find({ speciality, available: true }).select('-password');

        res.json({
            success: true,
            speciality,
            reason,
            urgent: !!urgent,
            urgentMessage: urgentMessage || null,
            doctors
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

export { recommendDoctor };
