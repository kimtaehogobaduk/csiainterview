interface FormattedFeedbackProps {
  content: string;
}

const FormattedFeedback = ({ content }: FormattedFeedbackProps) => {
  const formatText = (text: string) => {
    // Replace **text** with bold
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-lg">$1</strong>');
    
    // Replace ### heading with larger text
    formatted = formatted.replace(/^### (.*?)$/gm, '<div class="text-xl font-bold mt-4 mb-2">$1</div>');
    
    // Replace ## heading with even larger text
    formatted = formatted.replace(/^## (.*?)$/gm, '<div class="text-2xl font-bold mt-4 mb-2">$1</div>');
    
    // Replace # heading with largest text
    formatted = formatted.replace(/^# (.*?)$/gm, '<div class="text-3xl font-bold mt-6 mb-3">$1</div>');
    
    // Replace bullet points
    formatted = formatted.replace(/^- (.*?)$/gm, '<div class="ml-4 mb-1">• $1</div>');
    
    // Replace numbered lists
    formatted = formatted.replace(/^\d+\. (.*?)$/gm, '<div class="ml-4 mb-1">$1</div>');
    
    return formatted;
  };

  return (
    <div 
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: formatText(content) }}
    />
  );
};

export default FormattedFeedback;
